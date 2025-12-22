import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';

type AnggotaKk = {
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

function s(v: any) {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeAnggota(raw: any): AnggotaKk {
  return {
    nik: s(raw?.nik),
    nama: s(raw?.nama),
    jenisKelamin: s(raw?.jenisKelamin) || undefined,
    tempatLahir: s(raw?.tempatLahir) || undefined,
    tanggalLahir: s(raw?.tanggalLahir) || undefined,
    agama: s(raw?.agama) || undefined,
    statusHubunganKeluarga: s(raw?.statusHubunganKeluarga) || undefined,
  };
}

async function uploadToGCS(file: File, filename: string, credentials: any): Promise<string> {
  const storage = new Storage({ credentials });

  const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'hr-uploads-niko-2025';

  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = storage.bucket(BUCKET_NAME);
  const fileGCS = bucket.file(filename);

  await fileGCS.save(buffer, {
    metadata: { contentType: file.type },
  });

  await fileGCS.makePublic();

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

export async function POST(req: Request) {
  try {
    const credentials = getGoogleCredentials();

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const formData = await req.formData();

    const fileKTP = formData.get('fileKTP') as File;
    const fileKK = formData.get('fileKK') as File;
    const dataString = formData.get('data') as string;

    if (!fileKTP || !fileKK || !dataString) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const allData = JSON.parse(dataString);
    const { ktp, kk } = allData;

    console.log('[API] Memulai proses untuk NIK:', ktp?.nik);

    const timestamp = Date.now();
    const filenameKTP = `KTP_${ktp.nik}_${timestamp}.jpg`;
    const filenameKK = `KK_${kk.noKK}_${timestamp}.jpg`;

    const [linkKTP, linkKK] = await Promise.all([
      uploadToGCS(fileKTP, filenameKTP, credentials),
      uploadToGCS(fileKK, filenameKK, credentials),
    ]);

    console.log('[GCS] Upload Berhasil:', { linkKTP, linkKK });

    const rawMembers = Array.isArray(kk?.anggotaKeluarga) ? kk.anggotaKeluarga : [];
    const anggotaClean: AnggotaKk[] = rawMembers
      .map((m: any) => normalizeAnggota(m))
      .filter((m: AnggotaKk) => m.nik || m.nama);

    const anggotaJson = JSON.stringify({
      version: 3,
      count: anggotaClean.length,
      anggotaKeluarga: anggotaClean,
    });

    const values = [
      [
        new Date().toLocaleString('id-ID'),
        ktp.nik,
        ktp.nama,
        ktp.tempatLahir,
        ktp.tanggalLahir,
        ktp.jenisKelamin,
        ktp.alamat,
        ktp.rtRw,
        ktp.kelDesa,
        ktp.kecamatan,
        ktp.agama,
        ktp.statusPerkawinan,
        ktp.pekerjaan,
        ktp.kewarganegaraan,

        kk.noKK,
        kk.namaKepalaKeluarga,
        kk.alamat,
        kk.kodePos,
        kk.kelDesa,
        kk.kecamatan,
        kk.kabupatenKota,
        kk.provinsi,

        linkKTP,
        linkKK,
        anggotaJson,
      ],
    ];

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:Y',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    console.log('[SHEETS] Data tersimpan.');
    return NextResponse.json({ message: 'Success' });
  } catch (error: any) {
    console.error('[SERVER ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
