import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';
import Groq from 'groq-sdk';
import { buildKkPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';

// ======================
// GOOGLE CREDENTIALS (Vercel-safe)
// ======================
function getGoogleCredentials() {
  const raw = process.env.GOOGLE_CREDENTIALS;

  if (!raw) {
    throw new Error('GOOGLE_CREDENTIALS env is missing');
  }

  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const escaped = raw.replace(/\r?\n/g, '\\n');
    parsed = JSON.parse(escaped);
  }

  if (parsed?.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

// ======================
// GROQ CLIENT
// ======================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ======================
// PARSER LAMA (TETAP ADA, TAPI TIDAK DIPAKAI)
// ======================
function extractNoKK(fullText: string) {
  const text = String(fullText || '');

  const patterns = [
    /NO\.\s*KARTU\s*KELUARGA\s*[:\-]?\s*(\d{16})/i,
    /NOMOR\s*KARTU\s*KELUARGA\s*[:\-]?\s*(\d{16})/i,
    /\bNO\.\s*(\d{16})\b/i,
    /\b(\d{16})\b/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1];
    if (m && m[0] && m[0].replace(/\D/g, '').length === 16) return m[0].replace(/\D/g, '');
  }

  return '';
}

function isPdfFile(file: File) {
  const name = (file as any)?.name ? String((file as any).name).toLowerCase() : '';
  const type = (file?.type || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
}

function pickJsonObject(raw: string) {
  const txt = String(raw || '');
  const m = txt.match(/\{[\s\S]*\}/);
  return m ? m[0] : '';
}

async function ocrImageToText(client: ImageAnnotatorClient, buffer: Buffer) {
  const [result] = await client.textDetection(buffer);

  if (!result.textAnnotations || result.textAnnotations.length === 0) {
    throw new Error('No text detected');
  }

  return result.textAnnotations[0].description || '';
}

async function uploadBytesToGcs(
  storage: Storage,
  bucketName: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string
) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectPath);

  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  return `gs://${bucketName}/${objectPath}`;
}

async function readVisionOutputTextFromGcs(storage: Storage, bucketName: string, outputPrefix: string) {
  const bucket = storage.bucket(bucketName);

  const [files] = await bucket.getFiles({
    prefix: outputPrefix,
  });

  const jsonFiles = files
    .filter(f => f.name.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (jsonFiles.length === 0) {
    throw new Error('Vision output JSON not found in GCS');
  }

  let combined = '';

  for (const f of jsonFiles) {
    const [buf] = await f.download();
    const txt = buf.toString('utf-8');

    try {
      const parsed = JSON.parse(txt);
      const responses = Array.isArray(parsed?.responses) ? parsed.responses : [];
      for (const r of responses) {
        const pageText = r?.fullTextAnnotation?.text || '';
        if (pageText) {
          combined += (combined ? '\n' : '') + pageText;
        }
      }
    } catch {
      continue;
    }
  }

  return combined.trim();
}

async function ocrPdfToTextViaGcs(
  visionClient: ImageAnnotatorClient,
  storage: Storage,
  bucketName: string,
  pdfBuffer: Buffer
) {
  const ts = Date.now();
  const inputObject = `tmp/kk-input-${ts}.pdf`;
  const outputPrefix = `vision-output/kk-${ts}/`;

  const gcsSourceUri = await uploadBytesToGcs(
    storage,
    bucketName,
    inputObject,
    pdfBuffer,
    'application/pdf'
  );

  const gcsDestUri = `gs://${bucketName}/${outputPrefix}`;

  const request: any = {
    requests: [
      {
        inputConfig: {
          gcsSource: { uri: gcsSourceUri },
          mimeType: 'application/pdf',
        },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        outputConfig: {
          gcsDestination: { uri: gcsDestUri },
          batchSize: 5,
        },
      },
    ],
  };

  const [operation] = await (visionClient as any).asyncBatchAnnotateFiles(request);
  await operation.promise();

  const fullText = await readVisionOutputTextFromGcs(storage, bucketName, outputPrefix);

  return fullText;
}

// ======================
// ROUTE HANDLER
// ======================
export async function POST(req: Request) {
  try {
    const credentials = getGoogleCredentials();

    const visionClient = new ImageAnnotatorClient({ credentials });
    const storage = new Storage({ credentials });

    const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'hr-uploads-niko-2025';

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let fullText = '';

    if (isPdfFile(file)) {
      fullText = await ocrPdfToTextViaGcs(visionClient, storage, BUCKET_NAME, buffer);
      if (!fullText) {
        return NextResponse.json({ error: 'No text detected from PDF' }, { status: 400 });
      }
    } else {
      fullText = await ocrImageToText(visionClient, buffer);
      if (!fullText) {
        return NextResponse.json({ error: 'No text detected from image' }, { status: 400 });
      }
    }

    const prompt = buildKkPrompt(fullText);

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '';

    let parsedData: any;
    try {
      const jsonStr = pickJsonObject(raw) || raw;
      parsedData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'Groq output is not valid JSON', rawOutput: raw },
        { status: 422 }
      );
    }

    return NextResponse.json({
      message: 'Success',
      data: {
        noKK: String(parsedData?.noKK || '').trim(),
      },
    });
  } catch (error: any) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
