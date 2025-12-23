import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import Groq from 'groq-sdk';
import { buildKtpPrompt } from '@/lib/prompts';

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
// ROUTE HANDLER
// ======================
export async function POST(req: Request) {
  try {
    const credentials = getGoogleCredentials();
    const client = new ImageAnnotatorClient({ credentials });

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    // ======================
    // GOOGLE OCR
    // ======================
    const buffer = Buffer.from(await file.arrayBuffer());
    const [result] = await client.textDetection(buffer);

    if (!result.textAnnotations || result.textAnnotations.length === 0) {
      return NextResponse.json({ error: 'No text detected' }, { status: 400 });
    }

    const fullText = result.textAnnotations[0].description || '';

    // ======================
    // GROQ PROMPT
    // ======================
    const prompt = buildKtpPrompt(fullText);

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

    // ======================
    // STRICT JSON PARSE
    // ======================
    let extractedData: any;
    try {
      extractedData = JSON.parse(raw);
    } catch (err) {
      console.error('===== GROQ RAW OUTPUT =====');
      console.error(raw);
      console.error('==========================');

      return NextResponse.json(
        { error: 'Groq output is not valid JSON' },
        { status: 422 }
      );
    }

    // ======================
    // RESPONSE
    // ======================
    return NextResponse.json({
      message: 'Success',
      data: {
        nik: extractedData.nik || '',
        nama: extractedData.nama || '',
        tempatLahir: extractedData.tempatLahir || '',
        tanggalLahir: extractedData.tanggalLahir || '',
        jenisKelamin: extractedData.jenisKelamin || '',
        alamat: extractedData.alamat || '',
        rtRw: extractedData.rtRw || '',
        kelDesa: extractedData.kelDesa || '',
        kecamatan: extractedData.kecamatan || '',
        agama: extractedData.agama || '',
        statusPerkawinan: extractedData.statusPerkawinan || '',
        pekerjaan: extractedData.pekerjaan || '',
        kewarganegaraan: extractedData.kewarganegaraan || '',
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
