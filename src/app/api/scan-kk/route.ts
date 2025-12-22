import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
// import path from 'path'; // Tambahkan import path

type Anggota = {
  nik: string;
  nama: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  pendidikan?: string;
  jenisPekerjaan?: string;
  statusPerkawinan?: string;
  statusHubunganKeluarga?: string;
  ayah?: string;
  ibu?: string;
};

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
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  const c = cleanNameLike(last);
  if (!c) return '';
  if (c.length < 2) return '';
  return c.toUpperCase();
}

function stripKnownTokens(blockUpper: string, tokenUpper: string) {
  if (!tokenUpper) return blockUpper;
  const re = new RegExp(`\\b${tokenUpper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return blockUpper.replace(re, ' ').replace(/\s+/g, ' ').trim();
}

function extractParents(block: string, nama: string) {
  const up = normalizeSpaces(block).toUpperCase();
  const nameUp = normalizeSpaces(nama).toUpperCase();

  let x = up.replace(nameUp, ' ').replace(/\b\d{16}\b/g, ' ');
  x = x.replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g, ' ');
  x = x.replace(/\b(LAKI[\s\-]?LAKI|PEREMPUAN)\b/g, ' ');
  x = x.replace(/\b(ISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA|KONGHUCU)\b/g, ' ');
  x = x.replace(/\b(BELUM KAWIN|KAWIN|CERAI HIDUP|CERAI MATI)\b/g, ' ');
  x = x.replace(/\b(KEPALA KELUARGA|ISTRI|SUAMI|ANAK|MENANTU|CUCU|ORANG TUA|MERTUA|FAMILI LAIN|SAUDARA|KEPONAKAN)\b/g, ' ');
  x = x.replace(/\b(TIDAK\/BELUM SEKOLAH|BELUM TAMAT SD\/SEDERAJAT|TAMAT SD\/SEDERAJAT|SLTP\/SEDERAJAT|SLTA\/SEDERAJAT|DIPLOMA I\/II|DIPLOMA III|DIPLOMA IV\/S1|S1|S2|S3)\b/g, ' ');
  x = x.replace(/\s+/g, ' ').trim();

  const chunks = x.split(/\s{2,}|\s\|\s/).map(p => normalizeSpaces(p)).filter(Boolean);
  const tail = chunks.length ? chunks[chunks.length - 1] : '';
  const words = tail.split(' ').filter(Boolean);

  const stop = new Set([
    'WNI', 'WNA', 'KOTA', 'KABUPATEN', 'PROVINSI', 'KECAMATAN', 'DESA', 'KEL', 'RW', 'RT',
  ]);

  const filtered = words.filter(w => w.length > 1 && !stop.has(w));
  if (filtered.length < 2) return { ayah: '', ibu: '' };

  const ibu = filtered.slice(-3).join(' ').trim();
  const ayah = filtered.slice(0, Math.max(1, filtered.length - 3)).join(' ').trim();

  const ayahClean = cleanNameLike(ayah).toUpperCase();
  const ibuClean = cleanNameLike(ibu).toUpperCase();

  return {
    ayah: ayahClean.length >= 3 ? ayahClean : '',
    ibu: ibuClean.length >= 3 ? ibuClean : '',
  };
}

function parseMemberBlock(block: string, nik: string, nama: string): Anggota {
  const blockNorm = normalizeSpaces(block);
  const blockUpper = blockNorm.toUpperCase();

  const jenisKelamin = extractGender(blockUpper);

  const agama = pickFromSet(blockUpper, [
    'ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU',
  ]);

  const pendidikan = pickFromSet(blockUpper, [
    'TIDAK/BELUM SEKOLAH',
    'BELUM TAMAT SD/SEDERAJAT',
    'TAMAT SD/SEDERAJAT',
    'SLTP/SEDERAJAT',
    'SLTA/SEDERAJAT',
    'DIPLOMA I/II',
    'DIPLOMA III',
    'DIPLOMA IV/S1',
    'S1',
    'S2',
    'S3',
  ]);

  const statusPerkawinan = pickFromSet(blockUpper, [
    'BELUM KAWIN',
    'KAWIN',
    'CERAI HIDUP',
    'CERAI MATI',
  ]);

  const statusHubunganKeluarga = pickFromSet(blockUpper, [
    'KEPALA KELUARGA',
    'SUAMI',
    'ISTRI',
    'ANAK',
    'MENANTU',
    'CUCU',
    'ORANG TUA',
    'MERTUA',
    'FAMILI LAIN',
    'SAUDARA',
    'KEPONAKAN',
  ]);

  const tanggalLahir = extractDate(blockNorm);
  const tempatLahir = extractPlaceBeforeDate(blockNorm.toUpperCase(), tanggalLahir);

  let jenisPekerjaan = '';
  const afterNik = blockNorm.includes(nik) ? blockNorm.split(nik).slice(1).join(' ') : blockNorm;
  const afterNikUpper = afterNik.toUpperCase();

  const knownTokensToStrip = [
    nik,
    nama,
    jenisKelamin,
    agama,
    pendidikan,
    statusPerkawinan,
    statusHubunganKeluarga,
    tanggalLahir,
    tempatLahir,
  ].filter(Boolean);

  let tmp = afterNikUpper;
  for (const t of knownTokensToStrip) {
    tmp = stripKnownTokens(tmp, t.toUpperCase());
  }

  tmp = tmp.replace(/\bWNI\b|\bWNA\b/g, ' ').replace(/\s+/g, ' ').trim();
  const pieces = tmp.split(/\s{2,}|\s\|\s/).map(p => normalizeSpaces(p)).filter(Boolean);

  if (pieces.length) {
    const cand = pieces[0];
    const candClean = cleanNameLike(cand).toUpperCase();
    if (candClean.length >= 3) jenisPekerjaan = candClean;
  }

  const parents = extractParents(blockNorm, nama);

  return {
    nik,
    nama,
    jenisKelamin: jenisKelamin || undefined,
    tempatLahir: tempatLahir || undefined,
    tanggalLahir: tanggalLahir || undefined,
    agama: agama || undefined,
    pendidikan: pendidikan || undefined,
    jenisPekerjaan: jenisPekerjaan || undefined,
    statusPerkawinan: statusPerkawinan || undefined,
    statusHubunganKeluarga: statusHubunganKeluarga || undefined,
    ayah: parents.ayah || undefined,
    ibu: parents.ibu || undefined,
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
  } else {
    for (let i = 0; i < 10; i++) {
      const match = lines[i]?.match(/^\d{16}$/);
      if (match) {
        noKK = match[0];
        foundNiks.add(noKK);
        break;
      }
    }
  }

  const colonLines = lines
    .map(l => l.trim())
    .filter(l => l.startsWith(':'))
    .map(l => l.substring(1).trim());

  colonLines.forEach(val => {
    const v = val.trim();
    const up = v.toUpperCase();

    if (v.match(/^\d{3}\s*\/\s*\d{3}$/)) {
      if (!rtrw) rtrw = v;
      return;
    }

    if (v.match(/^\d{5}$/)) {
      if (!kodePos) kodePos = v;
      return;
    }

    if (up.includes('JL') || up.includes('JALAN') || up.includes('BLOK')) {
      if (!alamat) alamat = v;
      return;
    }

    if (up.includes('KABUPATEN') || up.includes('KOTA ')) {
      if (!kabupatenKota) kabupatenKota = v;
      return;
    }

    if (['JAWA', 'SUMATERA', 'KALIMANTAN', 'SULAWESI', 'PAPUA', 'BALI', 'NUSA', 'DKI', 'DI '].some(k => up.includes(k))) {
      if (!provinsi) provinsi = v;
      return;
    }

    if (v.length > 2) {
      if (!namaKepalaKeluarga && !v.match(/\d/) && v === v.toUpperCase()) {
        namaKepalaKeluarga = v;
        return;
      }

      const shouldKel = (!kelDesa && up.includes('DESA')) || !kelDesa;
      if (shouldKel) {
        if (!namaKepalaKeluarga.includes(v)) {
          if (!kelDesa) kelDesa = v;
          else if (!kecamatan) kecamatan = v;
        }
      }
    }
  });

  lines.forEach((line, i) => {
    const upper = line.toUpperCase();
    if (!kecamatan && upper.includes('KECAMATAN') && !upper.includes(':')) {
      if (lines[i + 1] && lines[i + 1].startsWith(':')) kecamatan = lines[i + 1].substring(1).trim();
    }
    if (!kabupatenKota && (upper.includes('KABUPATEN') || upper.includes('KOTA')) && !upper.includes(':')) {
      if (lines[i + 1] && lines[i + 1].startsWith(':')) kabupatenKota = lines[i + 1].substring(1).trim();
    }
    if (!provinsi && upper.includes('PROVINSI') && !upper.includes(':')) {
      if (lines[i + 1] && lines[i + 1].startsWith(':')) provinsi = lines[i + 1].substring(1).trim();
    }
  });

  const nikIndexes: { idx: number; nik: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const nikMatch = line.match(/\b\d{16}\b/);
    const isLongNum = line.match(/\d{17,}/);
    if (nikMatch && !isLongNum) {
      const nik = nikMatch[0];
      if (!foundNiks.has(nik)) {
        nikIndexes.push({ idx: i, nik });
        foundNiks.add(nik);
      }
    }
  }

  for (let k = 0; k < nikIndexes.length; k++) {
    const startIdx = nikIndexes[k].idx;
    const nik = nikIndexes[k].nik;
    const endIdx = k + 1 < nikIndexes.length ? nikIndexes[k + 1].idx : Math.min(lines.length, startIdx + 10);

    let extractedName = '';
    const line = lines[startIdx] ?? '';

    const parts = line.split(nik);
    if (parts[0] && parts[0].trim().length > 2) {
      extractedName = parts[0].trim();
    } else if (startIdx > 0) {
      const prevLine = (lines[startIdx - 1] ?? '').trim();
      if (prevLine.match(/^\d+\s+[A-Z]/)) extractedName = prevLine;
    }

    if (!extractedName) continue;

    let cleanNama = extractedName.replace(/^\d{1,2}\s+/, '').trim();
    cleanNama = cleanNama.replace(/[^a-zA-Z\s\.\,\']/g, '').trim();
    if (cleanNama.length <= 2) continue;
    if (cleanNama.toUpperCase().includes('KEPALA KELUARGA')) continue;

    const blockLines = [];
    for (let i = startIdx - 1; i <= endIdx; i++) {
      if (i >= 0 && i < lines.length) {
        const t = normalizeSpaces(lines[i] ?? '');
        if (t) blockLines.push(t);
      }
    }
    const block = blockLines.join(' | ');

    const anggota = parseMemberBlock(block, nik, cleanNama.toUpperCase());
    anggotaKeluarga.push(anggota);
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
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse((process.env.GOOGLE_CREDENTIALS as string).replace(/\\n/g, '\n')),
    });

    // const keyPath = path.join(process.cwd(), 'kunci_google.json');

    // // Inisialisasi client menggunakan keyFilename (jalur file fisik)
    // const client = new ImageAnnotatorClient({
    //   keyFilename: keyPath,
    // });

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return NextResponse.json({ error: 'No text detected' }, { status: 400 });
    }

    const fullText = detections[0].description || '';
    const extractedData = parseKKData(fullText);

    return NextResponse.json({ message: 'Success', data: extractedData }, { status: 200 });
  } catch (error: any) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
