// src/app/api/submit-complete/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';

// --- FUNGSI UPLOAD KE GCS (PENGGANTI DRIVE) ---
async function uploadToGCS(file: File, filename: string): Promise<string> {
  // 1. INISIALISASI STORAGE DI DALAM FUNGSI (Agar aman saat Build)
  const storage = new Storage({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS as string),
  });

  const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'hr-uploads-niko-2025';

  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = storage.bucket(BUCKET_NAME);
  const fileGCS = bucket.file(filename);

  // Upload File
  await fileGCS.save(buffer, {
    metadata: {
      contentType: file.type, // Agar browser tahu ini gambar
    },
  });

  // Jadikan Public agar bisa dilihat di Spreadsheet
  await fileGCS.makePublic();

  // Return Link Publik
  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

export async function POST(req: Request) {
  try {
    // 2. INISIALISASI GOOGLE AUTH DI DALAM FUNGSI (Agar aman saat Build)
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS as string),
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

    console.log('[API] Memulai proses untuk NIK:', ktp.nik);

    // 1. Upload ke Google Cloud Storage (GCS)
    const timestamp = Date.now();
    const filenameKTP = `KTP_${ktp.nik}_${timestamp}.jpg`;
    const filenameKK = `KK_${kk.noKK}_${timestamp}.jpg`;

    const [linkKTP, linkKK] = await Promise.all([
      uploadToGCS(fileKTP, filenameKTP),
      uploadToGCS(fileKK, filenameKK)
    ]);

    console.log('[GCS] Upload Berhasil:', { linkKTP, linkKK });

    // 2. Simpan ke Google Spreadsheet (25 Kolom)
    const anggotaJson = JSON.stringify(kk.anggotaKeluarga);

    const values = [
      [
        new Date().toLocaleString('id-ID'), // 1. Timestamp
        ktp.nik,                            // 2. NIK
        ktp.nama,                           // 3. Nama
        ktp.tempatLahir,                    // 4. Tempat Lahir
        ktp.tanggalLahir,                   // 5. Tgl Lahir
        ktp.jenisKelamin,                   // 6. JK
        ktp.alamat,                         // 7. Alamat KTP
        ktp.rtRw,                           // 8. RT/RW KTP
        ktp.kelDesa,                        // 9. Kel/Desa KTP
        ktp.kecamatan,                      // 10. Kec KTP
        ktp.agama,                          // 11. Agama
        ktp.statusPerkawinan,               // 12. Status
        ktp.pekerjaan,                      // 13. Pekerjaan
        ktp.kewarganegaraan,                // 14. WNI/WNA
        
        kk.noKK,                            // 15. No KK
        kk.namaKepalaKeluarga,              // 16. Kepala Keluarga
        kk.alamat,                          // 17. Alamat KK
        kk.kodePos,                         // 18. Kode Pos
        kk.kelDesa,                         // 19. Desa/Kel KK
        kk.kecamatan,                       // 20. Kec KK
        kk.kabupatenKota,                   // 21. Kab/Kota KK
        kk.provinsi,                        // 22. Provinsi KK
        
        linkKTP,                            // 23. Link KTP
        linkKK,                             // 24. Link KK
        anggotaJson                         // 25. JSON Anggota
      ]
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
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}