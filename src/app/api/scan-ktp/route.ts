// src/app/api/scan-ktp/route.ts
import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// --- HELPER FUNCTIONS (Aman ditaruh di luar) ---

function formatDateForInput(dateStr: string) {
  const cleanDate = dateStr.replace(/[^0-9\-\/]/g, '');
  
  let parts;
  if (cleanDate.includes('-')) parts = cleanDate.split('-');
  else if (cleanDate.includes('/')) parts = cleanDate.split('/');
  else return '';

  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return '';
}

function parseKTPData(fullText: string) {
  const lines = fullText.split('\n');
  const data = {
    nik: '',
    nama: '',
    tempatLahir: '', 
    tanggalLahir: '',
    jenisKelamin: '',
    alamat: '',
    rtRw: '',
    kelDesa: '',
    kecamatan: '',
    agama: '',
    statusPerkawinan: '',
    pekerjaan: '',
    kewarganegaraan: ''
  };

  let nikIndex = -1;
  let rtRwIndex = -1;

  // TAHAP 1: Global Search
  lines.forEach((line, index) => {
    const upperLine = line.toUpperCase().trim();

    // NIK
    const nikMatch = line.match(/\d{16}/);
    if (nikMatch) {
      data.nik = nikMatch[0];
      nikIndex = index;
    }

    // RT/RW
    if (line.match(/\d{3}\/\d{3}/)) {
        data.rtRw = line.match(/\d{3}\/\d{3}/)![0];
        rtRwIndex = index; 
    }

    // Status Perkawinan
    if (!data.statusPerkawinan) {
        if (upperLine.includes('BELUM KAWIN')) data.statusPerkawinan = 'BELUM KAWIN';
        else if (upperLine.includes('KAWIN')) data.statusPerkawinan = 'KAWIN';
        else if (upperLine.includes('CERAI MATI')) data.statusPerkawinan = 'CERAI MATI';
        else if (upperLine.includes('CERAI HIDUP') || upperLine.includes('CERAI')) data.statusPerkawinan = 'CERAI HIDUP';
    }

    // Agama
    if (!data.agama) {
        if (upperLine.includes('ISLAM')) data.agama = 'ISLAM';
        else if (upperLine.includes('KRISTEN')) data.agama = 'KRISTEN'; 
        else if (upperLine.includes('KATOLIK') || upperLine.includes('KATHOLIK')) data.agama = 'KATOLIK';
        else if (upperLine.includes('HINDU')) data.agama = 'HINDU';
        else if (upperLine.includes('BUDDHA')) data.agama = 'BUDDHA';
        else if (upperLine.includes('KONGHUCU')) data.agama = 'KONGHUCU';
        else if (upperLine.includes('KEPERCAYAAN')) data.agama = 'KEPERCAYAAN TERHADAP TUHAN YME';
    }

    // Pekerjaan
    if (!data.pekerjaan) {
        if (upperLine.includes('BELUM/TIDAK BEKERJA')) data.pekerjaan = 'BELUM/TIDAK BEKERJA';
        else if (upperLine.includes('PELAJAR/MAHASISWA')) data.pekerjaan = 'PELAJAR/MAHASISWA';
        else if (upperLine.includes('PEGAWAI NEGERI')) data.pekerjaan = 'PEGAWAI NEGERI SIPIL';
        else if (upperLine.includes('KARYAWAN SWASTA')) data.pekerjaan = 'KARYAWAN SWASTA';
        else if (upperLine.includes('WIRASWASTA')) data.pekerjaan = 'WIRASWASTA';
        else if (upperLine.includes('MENGURUS RUMAH')) data.pekerjaan = 'MENGURUS RUMAH TANGGA';
    }

    // Kecamatan
    if (upperLine.includes('KECAMATAN') && !data.kecamatan) {
        let val = line.replace(/Kecamatan/i, '').replace(/[:]/g, '').trim();
        if (val.length > 3) data.kecamatan = val;
        else if (lines[index + 1]) data.kecamatan = lines[index + 1].trim();
    }
  });

  // TAHAP 2: Anchor Logic (Berdasarkan posisi NIK)
  if (nikIndex !== -1) {
    // Nama
    if (lines[nikIndex + 1]) {
        let val = lines[nikIndex + 1].replace('Nama', '').replace(/[:]/g, '').trim();
        if (!val.match(/\d/)) data.nama = val;
    }

    // TTL
    if (lines[nikIndex + 2]) {
        let rawTTL = lines[nikIndex + 2].replace('Tempat/Tgl Lahir', '').replace(/[:]/g, '').trim();
        if (rawTTL.includes(',')) {
            const parts = rawTTL.split(',');
            data.tempatLahir = parts[0].trim();
            if (parts[1]) data.tanggalLahir = formatDateForInput(parts[1]);
        } else {
            data.tempatLahir = rawTTL; 
        }
    }

    // JK
    if (lines[nikIndex + 3]) {
        const lineJK = lines[nikIndex + 3].toUpperCase();
        if (lineJK.includes('LAKI')) data.jenisKelamin = 'LAKI-LAKI';
        else if (lineJK.includes('PEREMPUAN')) data.jenisKelamin = 'PEREMPUAN';
    }

    // Alamat
    for (let i = 4; i <= 6; i++) {
        const currentLine = lines[nikIndex + i];
        if (currentLine) {
            const upper = currentLine.toUpperCase();
            if (upper.includes('GOL. DARAH') || upper.includes('JENIS') || upper.includes('DARAH')) continue;
            if (upper.match(/\d{3}\/\d{3}/)) continue;
            if (!data.alamat && currentLine.length > 5) {
                data.alamat = currentLine.replace(/^[:\s]+/, ''); 
                break; 
            }
        }
    }
  }

  // TAHAP 3: Logic Relatif RT/RW (Cari Kelurahan)
  if (rtRwIndex !== -1 && !data.kelDesa) {
      const potentialKelurahan = lines[rtRwIndex + 1];
      if (potentialKelurahan) {
          const upper = potentialKelurahan.toUpperCase();
          if (!upper.includes('KEL/DESA') && !upper.includes('KECAMATAN') && !upper.includes('ALAMAT')) {
              data.kelDesa = potentialKelurahan.trim();
          }
      }
  }
  
  if (!data.kewarganegaraan && fullText.toUpperCase().includes('WNI')) {
      data.kewarganegaraan = 'WNI';
  }

  return data;
}

export async function POST(req: Request) {
  try {
    // --- PERBAIKAN: Client diinisialisasi DI DALAM fungsi ---
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse((process.env.GOOGLE_CREDENTIALS as string).replace(/\\n/g, '\n')),
    });

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
    const extractedData = parseKTPData(fullText);

    return NextResponse.json({
      message: 'Success',
      data: extractedData
    }, { status: 200 });

  } catch (error: any) {
    console.error('ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}