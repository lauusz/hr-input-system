import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

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

export async function POST(req: Request) {
  try {
    const credentials = getGoogleCredentials();
    const client = new ImageAnnotatorClient({ credentials });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const [result] = await client.textDetection(buffer);

    if (!result.textAnnotations || result.textAnnotations.length === 0) {
      return NextResponse.json({ error: 'No text detected' }, { status: 400 });
    }

    const fullText = result.textAnnotations[0].description || '';
    const noKK = extractNoKK(fullText);

    return NextResponse.json({
      message: 'Success',
      data: { noKK },
    });
  } catch (error: any) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
