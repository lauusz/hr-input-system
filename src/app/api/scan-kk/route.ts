// src/app/api/scan-kk/route.ts
import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// --- HELPER FUNCTION (Aman ditaruh di luar) ---
function parseKKData(fullText: string) {
  const lines = fullText.split('\n');
  
  let noKK = '';
  let namaKepalaKeluarga = '';
  let alamat = '';
  let rtrw = '';
  let kodePos = '';
  let kelDesa = '';
  let kecamatan = '';
  let kabupatenKota = '';
  let provinsi = '';
  
  let anggotaKeluarga: { nik: string; nama: string }[] = [];
  const foundNiks = new Set<string>();

  // --- 1. CARI NO KK (HEADER) ---
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

  // --- 2. LOGIC HEADER VERTIKAL ---
  const colonLines = lines
    .map(l => l.trim())
    .filter(l => l.startsWith(':'))
    .map(l => l.substring(1).trim());

  colonLines.forEach(val => {
      if (val.match(/^\d{3}\s*\/\s*\d{3}$/)) {
          if (!rtrw) rtrw = val;
      } 
      else if (val.match(/^\d{5}$/)) {
          if (!kodePos) kodePos = val;
      }
      else if (val.toUpperCase().includes('JL') || val.toUpperCase().includes('JALAN') || val.toUpperCase().includes('BLOK')) {
          if (!alamat) alamat = val;
      }
      else if (val.toUpperCase().includes('KABUPATEN') || val.toUpperCase().includes('KOTA ')) {
          if (!kabupatenKota) kabupatenKota = val;
      }
      else if (['JAWA', 'SUMATERA', 'KALIMANTAN', 'SULAWESI', 'PAPUA', 'BALI', 'NUSA', 'DKI', 'DI '].some(k => val.toUpperCase().includes(k))) {
          if (!provinsi) provinsi = val;
      }
      else if (val.length > 2) {
          if (!namaKepalaKeluarga && !val.match(/\d/) && val === val.toUpperCase()) {
             namaKepalaKeluarga = val;
          }
          else if (!kelDesa && val.toUpperCase().includes('DESA') || !kelDesa) { 
             if (!namaKepalaKeluarga.includes(val)) {
                 if (!kelDesa) kelDesa = val;
                 else if (!kecamatan) kecamatan = val;
             }
          }
      }
  });

  // Fallback Spesifik
  lines.forEach((line, i) => {
      const upper = line.toUpperCase();
      if (!kecamatan && upper.includes('KECAMATAN') && !upper.includes(':')) {
           if (lines[i+1] && lines[i+1].startsWith(':')) kecamatan = lines[i+1].substring(1).trim();
      }
      if (!kabupatenKota && (upper.includes('KABUPATEN') || upper.includes('KOTA')) && !upper.includes(':')) {
           if (lines[i+1] && lines[i+1].startsWith(':')) kabupatenKota = lines[i+1].substring(1).trim();
      }
      if (!provinsi && upper.includes('PROVINSI') && !upper.includes(':')) {
           if (lines[i+1] && lines[i+1].startsWith(':')) provinsi = lines[i+1].substring(1).trim();
      }
  });


  // --- 3. PARSING TABEL ANGGOTA ---
  lines.forEach((line, index) => {
    const nikMatch = line.match(/\d{16}/);
    const isLongNum = line.match(/\d{17,}/); // Filter NIP/NIR
    
    if (nikMatch && !isLongNum) {
      const detectedNik = nikMatch[0];
      
      if (!foundNiks.has(detectedNik)) {
        foundNiks.add(detectedNik);
        
        let extractedName = '';

        // Skenario A: Nama di baris yang sama
        const parts = line.split(detectedNik);
        if (parts[0] && parts[0].trim().length > 2) {
            extractedName = parts[0].trim();
        } 
        // Skenario B: Nama di baris sebelumnya
        else if (index > 0) {
            const prevLine = lines[index - 1].trim();
            if (prevLine.match(/^\d+\s+[A-Z]/)) {
                extractedName = prevLine;
            }
        }

        if (extractedName) {
            let cleanName = extractedName.replace(/^\d{1,2}\s+/, '').trim();
            cleanName = cleanName.replace(/[^a-zA-Z\s\.\,\']/g, '').trim();

            if (cleanName.length > 2 && !cleanName.includes('KEPALA KELUARGA')) {
                anggotaKeluarga.push({
                    nik: detectedNik,
                    nama: cleanName
                });
            }
        }
      }
    }
  });

  return { 
    noKK, namaKepalaKeluarga, alamat, rtrw, kodePos, 
    kelDesa, kecamatan, kabupatenKota, provinsi, 
    anggotaKeluarga 
  };
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
    
    // Proses Parsing
    const extractedData = parseKKData(fullText);

    return NextResponse.json({
      message: 'Success',
      data: extractedData
    }, { status: 200 });

  } catch (error: any) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}