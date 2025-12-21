// src/app/input-data/page.tsx
'use client';

import { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// --- TIPE DATA ---
interface KTPData {
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: string;
  alamat: string;
  rtRw: string;
  kelDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
}

interface KKHeader {
  noKK: string;
  namaKepalaKeluarga: string;
  alamat: string;
  rtrw: string;
  kodePos: string;
  // Field Tambahan Wilayah
  kelDesa: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
}

interface Anggota {
  nik: string;
  nama: string;
}

export default function InputDataPage() {
  const router = useRouter();
  
  // STATE NAVIGATION & VISIBILITY
  const [step, setStep] = useState(1);
  const [showKtpForm, setShowKtpForm] = useState(false);
  const [showKkForm, setShowKkForm] = useState(false);

  // STATE LOADING
  const [loadingKTP, setLoadingKTP] = useState(false);
  const [loadingKK, setLoadingKK] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STATE FILE & PREVIEW
  const [fileKTP, setFileKTP] = useState<File | null>(null);
  const [previewKTP, setPreviewKTP] = useState<string | null>(null);
  const [fileKK, setFileKK] = useState<File | null>(null);
  const [previewKK, setPreviewKK] = useState<string | null>(null);

  // STATE DATA FORM
  const [ktpData, setKtpData] = useState<KTPData>({
    nik: '', nama: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: '',
    alamat: '', rtRw: '', kelDesa: '', kecamatan: '', agama: '',
    statusPerkawinan: '', pekerjaan: '', kewarganegaraan: ''
  });

  const [kkHeader, setKkHeader] = useState<KKHeader>({
    noKK: '', namaKepalaKeluarga: '', alamat: '', rtrw: '', kodePos: '',
    kelDesa: '', kecamatan: '', kabupatenKota: '', provinsi: ''
  });

  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);

  // --- HANDLER KTP ---
  const handleFileKTP = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { 
        setFileKTP(f); 
        setPreviewKTP(URL.createObjectURL(f)); 
        setShowKtpForm(false); // Reset form jika ganti gambar
    }
  };

  const scanKTP = async () => {
    if (!fileKTP) return;
    setLoadingKTP(true);
    const fd = new FormData();
    fd.append('file', fileKTP);
    
    try {
      const res = await fetch('/api/scan-ktp', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok) {
        setKtpData(json.data);
        setShowKtpForm(true); // Tampilkan form
      } else {
        alert('Gagal Scan KTP: ' + json.error);
      }
    } catch (e) { alert('Terjadi kesalahan sistem saat scan KTP'); }
    finally { setLoadingKTP(false); }
  };

  // --- HANDLER KK ---
  const handleFileKK = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { 
        setFileKK(f); 
        setPreviewKK(URL.createObjectURL(f));
        setShowKkForm(false); // Reset form jika ganti gambar
    }
  };

  const scanKK = async () => {
    if (!fileKK) return;
    setLoadingKK(true);
    const fd = new FormData();
    fd.append('file', fileKK);

    try {
      const res = await fetch('/api/scan-kk', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok) {
        setKkHeader({
          noKK: json.data.noKK || '',
          namaKepalaKeluarga: json.data.namaKepalaKeluarga || '',
          alamat: json.data.alamat || '',
          rtrw: json.data.rtrw || '',
          kodePos: json.data.kodePos || '',
          kelDesa: json.data.kelDesa || '',
          kecamatan: json.data.kecamatan || '',
          kabupatenKota: json.data.kabupatenKota || '',
          provinsi: json.data.provinsi || ''
        });
        setAnggotaList(json.data.anggotaKeluarga || []);
        setShowKkForm(true); // Tampilkan form
      } else {
        alert('Gagal Scan KK: ' + json.error);
      }
    } catch (e) { alert('Terjadi kesalahan sistem saat scan KK'); }
    finally { setLoadingKK(false); }
  };

  // --- INPUT CHANGES ---
  const changeKTP = (e: any) => setKtpData({ ...ktpData, [e.target.name]: e.target.value });
  const changeKKHead = (e: any) => setKkHeader({ ...kkHeader, [e.target.name]: e.target.value });
  
  const changeMember = (idx: number, field: keyof Anggota, val: string) => {
    const arr = [...anggotaList]; 
    arr[idx][field] = val; 
    setAnggotaList(arr);
  };
  
  const addMember = () => setAnggotaList([...anggotaList, { nik: '', nama: '' }]);
  const removeMember = (idx: number) => setAnggotaList(anggotaList.filter((_, i) => i !== idx));

  // --- NAVIGATION ---
  const nextStep = () => {
    if (!fileKTP || !ktpData.nik) {
      alert('Harap selesaikan Scan KTP terlebih dahulu.');
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const prevStep = () => { 
    setStep(1); 
    window.scrollTo(0, 0); 
  };

  const handleSubmitAll = async () => {
    if (!fileKTP || !fileKK) { 
      alert('File KTP dan KK harus diupload.'); 
      return; 
    }
    setIsSubmitting(true);

    const payload = {
      ktp: ktpData,
      kk: { ...kkHeader, anggotaKeluarga: anggotaList }
    };

    const fd = new FormData();
    fd.append('fileKTP', fileKTP);
    fd.append('fileKK', fileKK);
    fd.append('data', JSON.stringify(payload));

    try {
      const res = await fetch('/api/submit-complete', { method: 'POST', body: fd });
      if (res.ok) {
        alert('SUKSES! Semua data berhasil disimpan.');
        router.refresh(); 
        // Opsional: Reset state manual disini jika ingin input lagi tanpa refresh
        window.location.reload(); 
      } else {
        const json = await res.json();
        alert('Gagal Menyimpan: ' + json.error);
      }
    } catch (e) { alert('Error saat mengirim data ke server.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-screen p-6 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white p-8 rounded-xl shadow-xl">
        
        {/* --- PROGRESS BAR --- */}
        <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step === 1 ? 'bg-blue-600 text-white scale-110' : 'bg-green-500 text-white'}`}>1</div>
            <div className={`w-24 h-1 transition-all ${step === 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step === 2 ? 'bg-green-600 text-white scale-110' : 'bg-gray-300 text-gray-500'}`}>2</div>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
            {step === 1 ? 'Langkah 1: Input Data KTP' : 'Langkah 2: Input Data KK'}
        </h1>

        {/* ================= STEP 1: KTP ================= */}
        {step === 1 && (
            <section className="animate-fade-in">
                {/* Upload Section */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                    <div className="flex-1 w-full bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                        <label className="block font-semibold text-blue-900 mb-3">Upload Foto KTP</label>
                        <input type="file" accept="image/*" onChange={handleFileKTP} className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-blue-700 file:border-0 hover:file:bg-blue-100 cursor-pointer"/>
                        
                        <button 
                            onClick={scanKTP} 
                            disabled={!fileKTP || loadingKTP} 
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition shadow-md"
                        >
                            {loadingKTP ? '⏳ Sedang Memindai...' : '🔍 Scan KTP Sekarang'}
                        </button>
                    </div>
                    {previewKTP && (
                        <div className="w-full md:w-1/3 h-56 relative border rounded-lg bg-gray-200 shadow-inner overflow-hidden">
                            <Image src={previewKTP} alt="Preview KTP" fill style={{objectFit:'contain'}} />
                        </div>
                    )}
                </div>

                {/* Form KTP (Muncul setelah scan) */}
                {showKtpForm && (
                    <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center">📝 Hasil Scan KTP <span className="text-xs font-normal ml-2 text-gray-500">(Silakan koreksi jika ada yang salah)</span></h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div className="col-span-2"><label className="lbl">NIK</label><input name="nik" value={ktpData.nik} onChange={changeKTP} className="inp font-bold tracking-wide"/></div>
                            <div className="col-span-2"><label className="lbl">Nama Lengkap</label><input name="nama" value={ktpData.nama} onChange={changeKTP} className="inp"/></div>
                            
                            {/* Split TTL */}
                            <div><label className="lbl">Tempat Lahir</label><input name="tempatLahir" value={ktpData.tempatLahir} onChange={changeKTP} className="inp"/></div>
                            <div><label className="lbl">Tanggal Lahir</label><input type="date" name="tanggalLahir" value={ktpData.tanggalLahir} onChange={changeKTP} className="inp cursor-pointer"/></div>
                            
                            <div>
                                <label className="lbl">Jenis Kelamin</label>
                                <select name="jenisKelamin" value={ktpData.jenisKelamin} onChange={changeKTP} className="inp cursor-pointer">
                                    <option value="">-- Pilih --</option><option value="LAKI-LAKI">LAKI-LAKI</option><option value="PEREMPUAN">PEREMPUAN</option>
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Agama</label>
                                <select name="agama" value={ktpData.agama} onChange={changeKTP} className="inp cursor-pointer">
                                    <option value="">-- Pilih --</option>
                                    {['ISLAM','KRISTEN','KATOLIK','HINDU','BUDDHA','KONGHUCU','KEPERCAYAAN TERHADAP TUHAN YME'].map(a=><option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lbl">Status Perkawinan</label>
                                <select name="statusPerkawinan" value={ktpData.statusPerkawinan} onChange={changeKTP} className="inp cursor-pointer">
                                    <option value="">-- Pilih --</option>
                                    {['BELUM KAWIN','KAWIN','CERAI HIDUP','CERAI MATI'].map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div><label className="lbl">Pekerjaan</label><input name="pekerjaan" value={ktpData.pekerjaan} onChange={changeKTP} className="inp"/></div>
                            
                            <div className="col-span-2 mt-2"><label className="lbl">Alamat (Sesuai KTP)</label><input name="alamat" value={ktpData.alamat} onChange={changeKTP} className="inp"/></div>
                            <div><label className="lbl">RT/RW</label><input name="rtRw" value={ktpData.rtRw} onChange={changeKTP} className="inp"/></div>
                            <div><label className="lbl">Kel/Desa</label><input name="kelDesa" value={ktpData.kelDesa} onChange={changeKTP} className="inp"/></div>
                            <div><label className="lbl">Kecamatan</label><input name="kecamatan" value={ktpData.kecamatan} onChange={changeKTP} className="inp"/></div>
                            <div><label className="lbl">Kewarganegaraan</label><input name="kewarganegaraan" value={ktpData.kewarganegaraan} onChange={changeKTP} className="inp"/></div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <button onClick={nextStep} className="bg-blue-700 text-white px-10 py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg w-full md:w-auto transform hover:-translate-y-1">
                                Lanjut ke Upload KK →
                            </button>
                        </div>
                    </div>
                )}
            </section>
        )}

        {/* ================= STEP 2: KK ================= */}
        {step === 2 && (
            <section className="animate-fade-in">
                {/* Upload Section */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                    <div className="flex-1 w-full bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
                        <label className="block font-semibold text-green-900 mb-3">Upload Foto Kartu Keluarga</label>
                        <input type="file" accept="image/*" onChange={handleFileKK} className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-green-700 file:border-0 hover:file:bg-green-100 cursor-pointer"/>
                        
                        <button 
                            onClick={scanKK} 
                            disabled={!fileKK || loadingKK} 
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition shadow-md"
                        >
                            {loadingKK ? '⏳ Sedang Memindai...' : '🔍 Scan KK Sekarang'}
                        </button>
                    </div>
                    {previewKK && (
                         <div className="w-full md:w-1/3 h-56 relative border rounded-lg bg-gray-200 shadow-inner overflow-hidden">
                            <Image src={previewKK} alt="Preview KK" fill style={{objectFit:'contain'}} />
                        </div>
                    )}
                </div>

                {/* Form KK (Muncul setelah scan) */}
                {showKkForm && (
                    <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                         <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center">📝 Hasil Scan KK</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="col-span-2"><label className="lbl">No. Kartu Keluarga</label><input name="noKK" value={kkHeader.noKK} onChange={changeKKHead} className="inp font-bold text-lg tracking-wide"/></div>
                            <div className="col-span-2"><label className="lbl">Nama Kepala Keluarga</label><input name="namaKepalaKeluarga" value={kkHeader.namaKepalaKeluarga} onChange={changeKKHead} className="inp"/></div>
                            
                            <div className="col-span-2"><label className="lbl">Alamat KK</label><input name="alamat" value={kkHeader.alamat} onChange={changeKKHead} className="inp"/></div>
                            <div><label className="lbl">RT/RW</label><input name="rtrw" value={kkHeader.rtrw} onChange={changeKKHead} className="inp"/></div>
                            <div><label className="lbl">Kode Pos</label><input name="kodePos" value={kkHeader.kodePos} onChange={changeKKHead} className="inp"/></div>
                            
                            {/* FIELD TAMBAHAN KK */}
                            <div><label className="lbl">Desa/Kelurahan</label><input name="kelDesa" value={kkHeader.kelDesa} onChange={changeKKHead} className="inp"/></div>
                            <div><label className="lbl">Kecamatan</label><input name="kecamatan" value={kkHeader.kecamatan} onChange={changeKKHead} className="inp"/></div>
                            <div><label className="lbl">Kabupaten/Kota</label><input name="kabupatenKota" value={kkHeader.kabupatenKota} onChange={changeKKHead} className="inp"/></div>
                            <div><label className="lbl">Provinsi</label><input name="provinsi" value={kkHeader.provinsi} onChange={changeKKHead} className="inp"/></div>
                        </div>

                        {/* Tabel Anggota */}
                        <div className="bg-gray-50 p-5 rounded-lg mb-8 border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-700">Daftar Anggota Keluarga</h3>
                                <button onClick={addMember} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 font-bold transition">+ Tambah Baris Manual</button>
                            </div>
                            
                            {anggotaList.length > 0 ? (
                                anggotaList.map((m, i) => (
                                    <div key={i} className="flex gap-3 mb-2 items-center">
                                        <div className="flex-1">
                                            <input placeholder="NIK Anggota" value={m.nik} onChange={(e)=>changeMember(i,'nik',e.target.value)} className="inp text-sm py-2"/>
                                        </div>
                                        <div className="flex-[2]">
                                            <input placeholder="Nama Lengkap" value={m.nama} onChange={(e)=>changeMember(i,'nama',e.target.value)} className="inp text-sm py-2"/>
                                        </div>
                                        <button onClick={()=>removeMember(i)} className="bg-white border border-red-200 text-red-500 hover:bg-red-50 font-bold px-3 py-2 rounded-md transition" title="Hapus">✕</button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-400 italic text-sm py-4">Belum ada anggota keluarga terdeteksi.</p>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                            <button onClick={prevStep} className="flex-1 bg-gray-500 text-white py-4 rounded-lg font-bold hover:bg-gray-600 transition shadow">
                                ← Kembali (Edit KTP)
                            </button>
                            <button 
                                onClick={handleSubmitAll} 
                                disabled={isSubmitting || !kkHeader.noKK}
                                className="flex-[2] bg-indigo-700 text-white py-4 rounded-lg font-bold shadow-lg hover:bg-indigo-800 disabled:bg-gray-400 transition transform hover:-translate-y-1"
                            >
                                {isSubmitting ? '🚀 Sedang Mengirim Data...' : '✓ SIMPAN SEMUA DATA'}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        )}

        {/* CSS IN JS */}
        <style jsx>{`
          .lbl { display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 4px; }
          .inp { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; color: #1f2937; font-weight: 500; transition: all 0.2s; }
          .inp:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          .animate-fade-in { animation: fadeIn 0.4s ease-out; }
          .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </main>
  );
}