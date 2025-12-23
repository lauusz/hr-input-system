'use client';

import { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// --- INTERFACES ---
interface KTPData {
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
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
  pendidikanTerakhir: string; // UPDATE: Tambah field interface
}

// --- HELPER ---
function isFilled(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

export default function InputDataPage() {
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(1);
  const [showKtpForm, setShowKtpForm] = useState(false);
  const [showKkForm, setShowKkForm] = useState(false);

  const [loadingKTP, setLoadingKTP] = useState(false);
  const [loadingKK, setLoadingKK] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File States
  const [fileKTP, setFileKTP] = useState<File | null>(null);
  const [previewKTP, setPreviewKTP] = useState<string | null>(null);

  const [fileKK, setFileKK] = useState<File | null>(null);
  const [previewKK, setPreviewKK] = useState<string | null>(null);
  const [isPdfKK, setIsPdfKK] = useState(false); // Penanda khusus jika KK adalah PDF

  // Data States
  const [ktpData, setKtpData] = useState<KTPData>({
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
    kewarganegaraan: '',
  });

  const [kkHeader, setKkHeader] = useState<KKHeader>({
    noKK: '',
    pendidikanTerakhir: '', // UPDATE: Inisialisasi state
  });

  // --- HANDLERS KTP (IMAGE ONLY) ---
  const handleFileKTP = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileKTP(f);
      setPreviewKTP(URL.createObjectURL(f));
      setShowKtpForm(false);
    }
  };

  const uploadKTP = async () => {
    if (!fileKTP) return;
    setLoadingKTP(true);

    const fd = new FormData();
    fd.append('file', fileKTP);

    try {
      const res = await fetch('/api/scan-ktp', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok) {
        setKtpData(json.data);
        setShowKtpForm(true);
      } else {
        alert('Gagal Unggah KTP: ' + json.error);
      }
    } catch {
      alert('Terjadi kesalahan sistem saat unggah KTP');
    } finally {
      setLoadingKTP(false);
    }
  };

  // --- HANDLERS KK (IMAGE + PDF) ---
  const handleFileKK = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileKK(f);

      // Cek Tipe File
      if (f.type === 'application/pdf') {
        setIsPdfKK(true);
        setPreviewKK(null); // Tidak menampilkan preview gambar
      } else {
        setIsPdfKK(false);
        setPreviewKK(URL.createObjectURL(f)); // Tampilkan preview gambar
      }

      setShowKkForm(false);
    }
  };

  const uploadKK = async () => {
    if (!fileKK) return;
    setLoadingKK(true);

    const fd = new FormData();
    fd.append('file', fileKK);

    try {
      const res = await fetch('/api/scan-kk', { method: 'POST', body: fd });
      const json = await res.json();
      if (res.ok) {
        // UPDATE: Pastikan pendidikanTerakhir di-reset atau di-maintain saat upload ulang
        setKkHeader({
          noKK: json.data?.noKK || '',
          pendidikanTerakhir: kkHeader.pendidikanTerakhir
        });
        setShowKkForm(true);
      } else {
        alert('Gagal Unggah KK: ' + json.error);
      }
    } catch {
      alert('Terjadi kesalahan sistem saat unggah KK');
    } finally {
      setLoadingKK(false);
    }
  };

  // --- FORM HANDLERS ---
  const changeKTP = (e: any) => setKtpData({ ...ktpData, [e.target.name]: e.target.value });
  const changeKKHead = (e: any) => setKkHeader({ ...kkHeader, [e.target.name]: e.target.value });

  const nextStep = () => {
    const requiredKtpFields: (keyof KTPData)[] = [
      'nik', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin',
      'alamat', 'rtRw', 'kelDesa', 'kecamatan', 'agama',
      'statusPerkawinan', 'pekerjaan', 'kewarganegaraan',
    ];

    for (const key of requiredKtpFields) {
      if (!isFilled(ktpData[key])) {
        alert(`Field KTP "${key}" wajib diisi.`);
        return;
      }
      if (!isFilled(ktpData.tanggalLahir)) {
        alert('Tanggal Lahir wajib diisi.');
        return;
      }
    }

    if (!fileKTP) {
      alert('File KTP wajib diupload.');
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

    if (!isFilled(kkHeader.noKK)) {
      alert('No. Kartu Keluarga wajib diisi.');
      return;
    }

    // UPDATE: Validasi Field Baru
    if (!isFilled(kkHeader.pendidikanTerakhir)) {
      alert('Pendidikan Terakhir wajib dipilih.');
      return;
    }

    if (!isFilled(ktpData.tanggalLahir)) {
      alert('Tanggal Lahir wajib diisi.');
      return;
    }


    setIsSubmitting(true);

    const payload = {
      ktp: ktpData,
      // UPDATE: Masukkan pendidikanTerakhir ke payload
      kk: {
        noKK: kkHeader.noKK,
        pendidikanTerakhir: kkHeader.pendidikanTerakhir
      },
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
        window.location.reload();
      } else {
        const json = await res.json();
        alert('Gagal Menyimpan: ' + json.error);
      }
    } catch {
      alert('Error saat mengirim data ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // RESPONSIVE PADDING: p-3 (mobile) -> p-6 (desktop)
    <main className="min-h-screen p-3 md:p-6 bg-gray-100 flex flex-col items-center">

      {/* CARD CONTAINER: p-5 (mobile) -> p-8 (desktop) */}
      <div className="w-full max-w-5xl bg-white p-5 md:p-8 rounded-xl shadow-xl">

        {/* STEPPER */}
        <div className="flex items-center justify-center mb-6 md:mb-8">
          <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-bold transition-all ${step === 1 ? 'bg-blue-600 text-white scale-110' : 'bg-green-500 text-white'}`}>
            1
          </div>
          <div className={`w-16 md:w-24 h-1 transition-all ${step === 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-bold transition-all ${step === 2 ? 'bg-green-600 text-white scale-110' : 'bg-gray-300 text-gray-500'}`}>
            2
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center text-gray-800">
          {step === 1 ? 'Langkah 1: Input Data KTP' : 'Langkah 2: Input Data KK'}
        </h1>

        {/* --- STEP 1: KTP --- */}
        {step === 1 && (
          <section className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
              <div className="flex-1 w-full bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100 shadow-sm">
                <label className="block font-semibold text-blue-900 mb-3">Upload Foto KTP</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileKTP}
                  className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-blue-700 file:border-0 hover:file:bg-blue-100 cursor-pointer"
                  required
                />
                <button
                  onClick={uploadKTP}
                  disabled={!fileKTP || loadingKTP}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition shadow-md active:scale-95"
                >
                  {loadingKTP ? '⏳ Sedang Memproses...' : '⬆️ Unggah KTP Sekarang'}
                </button>
              </div>

              {previewKTP && (
                <div className="w-full md:w-1/3 h-48 md:h-56 relative border rounded-lg bg-gray-200 shadow-inner overflow-hidden">
                  <Image src={previewKTP} alt="Preview KTP" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>

            {showKtpForm && (
              <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex flex-col md:flex-row md:items-center">
                  <span>📝 Data KTP</span>
                  <span className="text-xs font-normal md:ml-2 text-gray-500 mt-1 md:mt-0">(Silakan koreksi jika ada yang salah)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
                  {/* Inputs KTP (Sama seperti sebelumnya) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="lbl">NIK</label>
                    <input name="nik" value={ktpData.nik} onChange={changeKTP} className="inp font-bold tracking-wide" required inputMode="numeric" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="lbl">Nama Lengkap</label>
                    <input name="nama" value={ktpData.nama} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Tempat Lahir</label>
                    <input name="tempatLahir" value={ktpData.tempatLahir} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Tanggal Lahir</label>
                    <input name="tanggalLahir" value={ktpData.tanggalLahir} onChange={changeKTP} className="inp cursor-pointer" required />
                  </div>
                  <div>
                    <label className="lbl">Jenis Kelamin</label>
                    <select name="jenisKelamin" value={ktpData.jenisKelamin} onChange={changeKTP} className="inp cursor-pointer" required>
                      <option value="">-- Pilih --</option>
                      <option value="LAKI-LAKI">LAKI-LAKI</option>
                      <option value="PEREMPUAN">PEREMPUAN</option>
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Agama</label>
                    <select name="agama" value={ktpData.agama} onChange={changeKTP} className="inp cursor-pointer" required>
                      <option value="">-- Pilih --</option>
                      {['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'KEPERCAYAAN TERHADAP TUHAN YME'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Status Perkawinan</label>
                    <select name="statusPerkawinan" value={ktpData.statusPerkawinan} onChange={changeKTP} className="inp cursor-pointer" required>
                      <option value="">-- Pilih --</option>
                      {['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Pekerjaan</label>
                    <input name="pekerjaan" value={ktpData.pekerjaan} onChange={changeKTP} className="inp" required />
                  </div>
                  <div className="col-span-1 md:col-span-2 mt-2">
                    <label className="lbl">Alamat (Sesuai KTP)</label>
                    <textarea name="alamat" value={ktpData.alamat} onChange={changeKTP} className="inp" rows={2} required />
                  </div>
                  <div>
                    <label className="lbl">RT/RW</label>
                    <input name="rtRw" value={ktpData.rtRw} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Kel/Desa</label>
                    <input name="kelDesa" value={ktpData.kelDesa} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Kecamatan</label>
                    <input name="kecamatan" value={ktpData.kecamatan} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Kewarganegaraan</label>
                    <input name="kewarganegaraan" value={ktpData.kewarganegaraan} onChange={changeKTP} className="inp" required />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={nextStep}
                    className="w-full md:w-auto bg-blue-700 text-white px-10 py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg transform active:scale-95"
                  >
                    Lanjut ke Upload KK →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* --- STEP 2: KK (IMAGE & PDF SUPPORT) --- */}
        {step === 2 && (
          <section className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
              <div className="flex-1 w-full bg-green-50 p-4 md:p-6 rounded-xl border border-green-100 shadow-sm">
                <label className="block font-semibold text-green-900 mb-3">Upload KK (Foto / PDF)</label>

                {/* ACCEPT IMAGE + PDF */}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileKK}
                  className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-green-700 file:border-0 hover:file:bg-green-100 cursor-pointer"
                  required
                />

                <button
                  onClick={uploadKK}
                  disabled={!fileKK || loadingKK}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition shadow-md active:scale-95"
                >
                  {loadingKK ? '⏳ Sedang Memproses...' : '⬆️ Unggah KK Sekarang'}
                </button>
              </div>

              {/* LOGIC PREVIEW KK (Handle PDF UI vs Image UI) */}
              {(previewKK || isPdfKK) && (
                <div className="w-full md:w-1/3 h-48 md:h-56 relative border rounded-lg bg-gray-200 shadow-inner overflow-hidden flex items-center justify-center">
                  {isPdfKK ? (
                    <div className="text-center p-4">
                      <div className="text-5xl mb-2">📄</div>
                      <p className="text-sm font-bold text-gray-600 break-all px-2">{fileKK?.name}</p>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded mt-2 inline-block font-semibold">Format PDF</span>
                    </div>
                  ) : (
                    previewKK && <Image src={previewKK} alt="Preview KK" fill style={{ objectFit: 'contain' }} />
                  )}
                </div>
              )}
            </div>

            {showKkForm && (
              <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center">📝 Data KK</h3>

                <div className="grid grid-cols-1 gap-5 mb-8">
                  <div>
                    <label className="lbl">No. Kartu Keluarga</label>
                    <input name="noKK" value={kkHeader.noKK} onChange={changeKKHead} className="inp font-bold text-lg tracking-wide" required inputMode="numeric" />
                  </div>

                  {/* UPDATE: Field Input Pendidikan Terakhir */}
                  <div>
                    <label className="lbl">Pendidikan Terakhir</label>
                    <select
                      name="pendidikanTerakhir"
                      value={kkHeader.pendidikanTerakhir}
                      onChange={changeKKHead}
                      className="inp cursor-pointer"
                      required
                    >
                      <option value="">-- Pilih --</option>
                      <option value="TIDAK / BELUM SEKOLAH">TIDAK / BELUM SEKOLAH</option>
                      <option value="BELUM TAMAT SD/SEDERAJAT">BELUM TAMAT SD/SEDERAJAT</option>
                      <option value="SD">TAMAT SD / SEDERAJAT</option>
                      <option value="SLTP/SEDERAJAT">SLTP/SEDERAJAT</option>
                      <option value="SLTA / SEDERAJAT">SLTA / SEDERAJAT</option>
                      <option value="DIPLOMA I / II">DIPLOMA I / II</option>
                      <option value="AKADEMI / DIPLOMA III / SARJANA MUDA">AKADEMI / DIPLOMA III / SARJANA MUDA</option>
                      <option value="DIPLOMA IV / STRATA I">DIPLOMA IV / STRATA I</option>
                      <option value="STRATA II">STRATA II</option>
                      <option value="STRATA III">STRATA III</option>
                    </select>
                  </div>
                </div>

                {/* TOMBOL MENUMPUK DI MOBILE (flex-col-reverse agar tombol simpan tetap di bawah atau order diatur) */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4 border-t">
                  <button
                    onClick={prevStep}
                    className="order-2 md:order-1 flex-1 bg-gray-500 text-white py-3 md:py-4 rounded-lg font-bold hover:bg-gray-600 transition shadow active:scale-95"
                    type="button"
                  >
                    ← Kembali (Edit KTP)
                  </button>
                  <button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting || !kkHeader.noKK || !kkHeader.pendidikanTerakhir}
                    className="order-1 md:order-2 flex-[2] bg-indigo-700 text-white py-3 md:py-4 rounded-lg font-bold shadow-lg hover:bg-indigo-800 disabled:bg-gray-400 transition transform active:scale-95"
                    type="button"
                  >
                    {isSubmitting ? '🚀 Sedang Mengirim Data...' : '✓ SIMPAN SEMUA DATA'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* CSS: Font size 16px pada .inp penting agar iOS tidak auto-zoom saat input diklik */}
        <style jsx>{`
          .lbl { display: block; font-size: 0.85rem; font-weight: 700; color: #374151; margin-bottom: 6px; }
          .inp { width: 100%; padding: 12px 12px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #111827; font-weight: 600; font-size: 16px; transition: all 0.2s; }
          .inp:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12); }
          .animate-fade-in { animation: fadeIn 0.4s ease-out; }
          .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </main>
  );
}