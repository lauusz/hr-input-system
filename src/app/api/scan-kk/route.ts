import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
// import path from 'path';

type Anggota = {
  nik: string;
  nama: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  statusHubunganKeluarga?: string;
};

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

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function cleanNameLike(s: string) {
  let x = s.replace(/[^A-Z\s\.\,\']/gi, ' ').replace(/\s+/g, ' ').trim();
  x = x.replace(/^\d{1,2}\s+/, '').trim();
  return x;
}

function pickFromSet(textUpper: string, candidates: string[]) {
  for (const c of candidates) {
    const cu = c.toUpperCase();
    const re = new RegExp(`\\b${cu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(textUpper)) return c;
  }
  return '';
}

function extractGender(textUpper: string) {
  if (/\bLAKI[\s\-]?LAKI\b/.test(textUpper)) return 'LAKI-LAKI';
  if (/\bPEREMPUAN\b/.test(textUpper)) return 'PEREMPUAN';
  if (/\bL\b/.test(textUpper) && !/\bSL\b/.test(textUpper)) return 'LAKI-LAKI';
  if (/\bP\b/.test(textUpper)) return 'PEREMPUAN';
  return '';
}

function extractDate(text: string) {
  const m = text.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
  return m ? m[0] : '';
}

function extractPlaceBeforeDate(block: string, dateStr: string) {
  if (!dateStr) return '';
  const idx = block.indexOf(dateStr);
  if (idx <= 0) return '';
  const left = block.slice(0, idx).trim();
  const parts = left.split(/\s{2,}|\s\|\s/).map(p => normalizeSpaces(p)).filter(Boolean);
  if (!parts.length) return '';
  const c = cleanNameLike(parts[parts.length - 1]);
  return c.length >= 2 ? c.toUpperCase() : '';
}

function stripKnownTokens(blockUpper: string, tokenUpper: string) {
  if (!tokenUpper) return blockUpper;
  const re = new RegExp(`\\b${tokenUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return blockUpper.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

function parseMemberBlock(block: string, nik: string, nama: string): Anggota {
  const blockNorm = normalizeSpaces(block);
  const blockUpper = blockNorm.toUpperCase();

  const jenisKelamin = extractGender(blockUpper);
  const agama = pickFromSet(blockUpper, ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU']);
  const statusHubunganKeluarga = pickFromSet(blockUpper, [
    'KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU',
    'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'SAUDARA', 'KEPONAKAN'
  ]);

  const tanggalLahir = extractDate(blockNorm);
  const tempatLahir = extractPlaceBeforeDate(blockUpper, tanggalLahir);

  let tmp = blockUpper;
  [nik, nama, jenisKelamin, agama, statusHubunganKeluarga, tanggalLahir, tempatLahir]
    .filter(Boolean)
    .forEach(t => tmp = stripKnownTokens(tmp, String(t)));

  return {
    nik,
    nama,
    jenisKelamin: jenisKelamin || undefined,
    tempatLahir: tempatLahir || undefined,
    tanggalLahir: tanggalLahir || undefined,
    agama: agama || undefined,
    statusHubunganKeluarga: statusHubunganKeluarga || undefined,
  };
}

function parseKKData(fullText: string) {
  const lines = fullText.split('\n').map(l => l.replace(/\r/g, ''));

  let noKK = '';
  let namaKepalaKeluarga = '';
  let alamat = '';
  let rtrw = '';
  let kodePos = '';
  let kelDesa = '';
  let kecamatan = '';
  let kabupatenKota = '';
  let provinsi = '';

  const anggotaKeluarga: Anggota[] = [];
  const foundNiks = new Set<string>();

  const noKKMatch = fullText.match(/No\.\s*(\d{16})/i);
  if (noKKMatch) {
    noKK = noKKMatch[1];
    foundNiks.add(noKK);
  }

  const nikIndexes: { idx: number; nik: string }[] = [];

  lines.forEach((line, i) => {
    const m = line.match(/\b\d{16}\b/);
    if (m && !foundNiks.has(m[0])) {
      foundNiks.add(m[0]);
      nikIndexes.push({ idx: i, nik: m[0] });
    }
  });

  for (let i = 0; i < nikIndexes.length; i++) {
    const { idx, nik } = nikIndexes[i];
    const end = i + 1 < nikIndexes.length ? nikIndexes[i + 1].idx : idx + 10;

    let name = '';
    const parts = lines[idx].split(nik);
    if (parts[0]?.trim()) name = cleanNameLike(parts[0]).toUpperCase();
    if (!name && idx > 0) name = cleanNameLike(lines[idx - 1]).toUpperCase();
    if (!name) continue;

    const block = lines.slice(Math.max(0, idx - 1), end).join(' | ');
    anggotaKeluarga.push(parseMemberBlock(block, nik, name));
  }

  return {
    noKK,
    namaKepalaKeluarga,
    alamat,
    rtrw,
    kodePos,
    kelDesa,
    kecamatan,
    kabupatenKota,
    provinsi,
    anggotaKeluarga,
  };
}

export async function POST(req: Request) {
  try {
    const credentials = getGoogleCredentials();
    const client = new ImageAnnotatorClient({ credentials });

    // const keyPath = path.join(process.cwd(), 'kunci_google.json');

    // // Inisialisasi menggunakan keyFilename (jalur file fisik)
    // const client = new ImageAnnotatorClient({
    //   keyFilename: keyPath,
    // });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const [result] = await client.textDetection(buffer);

    if (!result.textAnnotations || result.textAnnotations.length === 0) {
      return NextResponse.json({ error: 'No text detected' }, { status: 400 });
    }

    const fullText = result.textAnnotations[0].description || '';
    const extractedData = parseKKData(fullText);

    return NextResponse.json({ message: 'Success', data: extractedData });
  } catch (error: any) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
