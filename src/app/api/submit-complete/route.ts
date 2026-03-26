import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';

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

    let allData: any;
    try {
      allData = JSON.parse(dataString);
    } catch {
      return NextResponse.json({ error: 'Data tidak valid (JSON rusak)' }, { status: 400 });
    }

    const ktp = allData?.ktp || {};
    const kk = allData?.kk || {};
    const form = allData?.form || {};

    const nik = s(ktp?.nik);
    const noKK = s(kk?.noKK);
    const pendidikanTerakhir = s(kk?.pendidikanTerakhir) || s(form?.pendidikanTerakhir);

    if (!nik || !noKK) {
      return NextResponse.json({ error: 'Data tidak valid (NIK / NoKK kosong)' }, { status: 400 });
    }

    if (!pendidikanTerakhir) {
      return NextResponse.json({ error: 'Pendidikan terakhir wajib diisi' }, { status: 400 });
    }

    console.log('[API] Memulai proses untuk NIK:', nik);

    const timestamp = Date.now();
    const filenameKTP = `KTP_${nik}_${timestamp}.jpg`;
    const filenameKK = `KK_${noKK}_${timestamp}.jpg`;

    const [linkKTP, linkKK] = await Promise.all([
      uploadToGCS(fileKTP, filenameKTP, credentials),
      uploadToGCS(fileKK, filenameKK, credentials),
    ]);

    console.log('[GCS] Upload Berhasil:', { linkKTP, linkKK });

    const values = [
      [
        new Date().toLocaleString('id-ID'),
        s(form?.namaLengkap),
        s(form?.noHp),
        s(form?.email),
        s(form?.agama),
        s(form?.namaBank),
        s(form?.noRekening),
        s(form?.pendidikanTerakhir),
        s(form?.tanggalLahir),
        s(form?.tempatLahir),
        s(form?.domisili),
        s(form?.provinsi),
        s(form?.kabKota),
        s(form?.kecamatan),
        s(form?.desaKelurahan),
        s(form?.kodePos),
        s(ktp?.nik),
        s(ktp?.nama),
        s(ktp?.statusPerkawinan),
        s(ktp?.pekerjaan),
        noKK,
        s(form?.pendidikanTerakhir) || s(kk?.pendidikanTerakhir),
        linkKTP,
        linkKK,
      ],
    ];

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A128',
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
