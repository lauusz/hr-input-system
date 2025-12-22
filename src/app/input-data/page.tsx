'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
}

interface Anggota {
  nik: string;
  nama: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  statusHubunganKeluarga?: string;
  _open?: boolean;
}

function safeStr(v: any) {
  return typeof v === 'string' ? v : '';
}

function isFilled(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

const AGAMA_OPTIONS = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'] as const;

const HUBUNGAN_OPTIONS = [
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
] as const;

function onlyDigitsMax16(v: string) {
  return v.replace(/\D/g, '').slice(0, 16);
}

function isMemberComplete(m: Anggota) {
  return (
    isFilled(m.nik) &&
    m.nik.trim().length === 16 &&
    isFilled(m.nama) &&
    isFilled(m.jenisKelamin || '') &&
    isFilled(m.tempatLahir || '') &&
    isFilled(m.tanggalLahir || '') &&
    isFilled(m.agama || '') &&
    isFilled(m.statusHubunganKeluarga || '')
  );
}

export default function InputDataPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [showKtpForm, setShowKtpForm] = useState(false);
  const [showKkForm, setShowKkForm] = useState(false);

  const [loadingKTP, setLoadingKTP] = useState(false);
  const [loadingKK, setLoadingKK] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fileKTP, setFileKTP] = useState<File | null>(null);
  const [previewKTP, setPreviewKTP] = useState<string | null>(null);
  const [fileKK, setFileKK] = useState<File | null>(null);
  const [previewKK, setPreviewKK] = useState<string | null>(null);

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
  });

  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lastAddedIndex === null) return;
    const el = document.getElementById(`member-${lastAddedIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setLastAddedIndex(null);
  }, [lastAddedIndex]);

  const handleFileKTP = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileKTP(f);
      setPreviewKTP(URL.createObjectURL(f));
      setShowKtpForm(false);
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
        setShowKtpForm(true);
      } else {
        alert('Gagal Scan KTP: ' + json.error);
      }
    } catch {
      alert('Terjadi kesalahan sistem saat scan KTP');
    } finally {
      setLoadingKTP(false);
    }
  };

  const handleFileKK = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileKK(f);
      setPreviewKK(URL.createObjectURL(f));
      setShowKkForm(false);
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
        });

        const rawMembers = Array.isArray(json.data.anggotaKeluarga) ? json.data.anggotaKeluarga : [];
        const normalizedMembers: Anggota[] = rawMembers.map((m: any) => ({
          nik: safeStr(m?.nik),
          nama: safeStr(m?.nama),
          jenisKelamin: safeStr(m?.jenisKelamin) || undefined,
          tempatLahir: safeStr(m?.tempatLahir) || undefined,
          tanggalLahir: safeStr(m?.tanggalLahir) || undefined,
          agama: safeStr(m?.agama) || undefined,
          statusHubunganKeluarga: safeStr(m?.statusHubunganKeluarga) || undefined,
          _open: true,
        }));

        setAnggotaList(normalizedMembers);
        setShowKkForm(true);
      } else {
        alert('Gagal Scan KK: ' + json.error);
      }
    } catch {
      alert('Terjadi kesalahan sistem saat scan KK');
    } finally {
      setLoadingKK(false);
    }
  };

  const changeKTP = (e: any) => setKtpData({ ...ktpData, [e.target.name]: e.target.value });
  const changeKKHead = (e: any) => setKkHeader({ ...kkHeader, [e.target.name]: e.target.value });

  const changeMember = (idx: number, field: keyof Anggota, val: string) => {
    const arr = [...anggotaList];
    arr[idx] = { ...arr[idx], [field]: val };
    setAnggotaList(arr);
  };

  const toggleMemberOpen = (idx: number) => {
    const arr = [...anggotaList];
    arr[idx] = { ...arr[idx], _open: !arr[idx]._open };
    setAnggotaList(arr);
  };

  const addMember = () => {
    const nextIdx = anggotaList.length;
    setAnggotaList([
      ...anggotaList,
      {
        nik: '',
        nama: '',
        jenisKelamin: '',
        tempatLahir: '',
        tanggalLahir: '',
        agama: '',
        statusHubunganKeluarga: '',
        _open: true,
      },
    ]);
    setLastAddedIndex(nextIdx);
  };

  const removeMember = (idx: number) => setAnggotaList(anggotaList.filter((_, i) => i !== idx));

  const nextStep = () => {
    const requiredKtpFields: (keyof KTPData)[] = [
      'nik',
      'nama',
      'tempatLahir',
      'tanggalLahir',
      'jenisKelamin',
      'alamat',
      'rtRw',
      'kelDesa',
      'kecamatan',
      'agama',
      'statusPerkawinan',
      'pekerjaan',
      'kewarganegaraan',
    ];

    for (const key of requiredKtpFields) {
      if (!isFilled(ktpData[key])) {
        alert(`Field KTP "${key}" wajib diisi.`);
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

    for (let i = 0; i < anggotaList.length; i++) {
      const a = anggotaList[i];
      if (!isFilled(a.nik) || !isFilled(a.nama)) {
        alert(`Anggota keluarga ke-${i + 1}: NIK dan Nama wajib diisi.`);
        return;
      }
      if (a.nik.trim().length !== 16) {
        alert(`Anggota keluarga ke-${i + 1}: NIK harus 16 angka.`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      ktp: ktpData,
      kk: { noKK: kkHeader.noKK, anggotaKeluarga: anggotaList.map(({ _open, ...rest }) => rest) },
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
    <main className="min-h-screen p-6 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white p-8 rounded-xl shadow-xl">
        <div className="flex items-center justify-center mb-8">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
              step === 1 ? 'bg-blue-600 text-white scale-110' : 'bg-green-500 text-white'
            }`}
          >
            1
          </div>
          <div className={`w-24 h-1 transition-all ${step === 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
              step === 2 ? 'bg-green-600 text-white scale-110' : 'bg-gray-300 text-gray-500'
            }`}
          >
            2
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          {step === 1 ? 'Langkah 1: Input Data KTP' : 'Langkah 2: Input Data KK'}
        </h1>

        {step === 1 && (
          <section className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
              <div className="flex-1 w-full bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                <label className="block font-semibold text-blue-900 mb-3">Upload Foto KTP</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileKTP}
                  className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-blue-700 file:border-0 hover:file:bg-blue-100 cursor-pointer"
                  required
                />
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
                  <Image src={previewKTP} alt="Preview KTP" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>

            {showKtpForm && (
              <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center">
                  📝 Hasil Scan KTP <span className="text-xs font-normal ml-2 text-gray-500">(Silakan koreksi jika ada yang salah)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="col-span-2">
                    <label className="lbl">NIK</label>
                    <input name="nik" value={ktpData.nik} onChange={changeKTP} className="inp font-bold tracking-wide" required />
                  </div>
                  <div className="col-span-2">
                    <label className="lbl">Nama Lengkap</label>
                    <input name="nama" value={ktpData.nama} onChange={changeKTP} className="inp" required />
                  </div>

                  <div>
                    <label className="lbl">Tempat Lahir</label>
                    <input name="tempatLahir" value={ktpData.tempatLahir} onChange={changeKTP} className="inp" required />
                  </div>
                  <div>
                    <label className="lbl">Tanggal Lahir</label>
                    <input type="date" name="tanggalLahir" value={ktpData.tanggalLahir} onChange={changeKTP} className="inp cursor-pointer" required />
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
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="lbl">Status Perkawinan</label>
                    <select name="statusPerkawinan" value={ktpData.statusPerkawinan} onChange={changeKTP} className="inp cursor-pointer" required>
                      <option value="">-- Pilih --</option>
                      {['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI'].map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Pekerjaan</label>
                    <input name="pekerjaan" value={ktpData.pekerjaan} onChange={changeKTP} className="inp" required />
                  </div>

                  <div className="col-span-2 mt-2">
                    <label className="lbl">Alamat (Sesuai KTP)</label>
                    <input name="alamat" value={ktpData.alamat} onChange={changeKTP} className="inp" required />
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
                    className="bg-blue-700 text-white px-10 py-3 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg w-full md:w-auto transform hover:-translate-y-1"
                  >
                    Lanjut ke Upload KK →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade-in">
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
              <div className="flex-1 w-full bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
                <label className="block font-semibold text-green-900 mb-3">Upload Foto Kartu Keluarga</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileKK}
                  className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-white file:text-green-700 file:border-0 hover:file:bg-green-100 cursor-pointer"
                  required
                />

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
                  <Image src={previewKK} alt="Preview KK" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>

            {showKkForm && (
              <div className="animate-slide-up bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center">📝 Hasil Scan KK</h3>

                <div className="grid grid-cols-1 gap-5 mb-8">
                  <div>
                    <label className="lbl">No. Kartu Keluarga</label>
                    <input name="noKK" value={kkHeader.noKK} onChange={changeKKHead} className="inp font-bold text-lg tracking-wide" required />
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg mb-8 border border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-base">Anggota Keluarga</h3>
                      <div className="text-sm text-gray-600">
                        Isi data <b>satu per satu</b>. Klik tombol <b>“Isi Detail”</b> pada setiap anggota.
                      </div>
                    </div>

                    <button
                      onClick={addMember}
                      className="bg-indigo-700 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-800 transition shadow w-full md:w-auto"
                      type="button"
                    >
                      ➕ Tambah Anggota Keluarga
                    </button>
                  </div>

                  {anggotaList.length > 0 ? (
                    anggotaList.map((m, i) => {
                      const complete = isMemberComplete(m);
                      const title = m.nama?.trim() ? m.nama.trim() : `Anggota #${i + 1}`;
                      return (
                        <div key={i} id={`member-${i}`} className={`memberCard ${m._open ? 'open' : ''}`}>
                          <div className="memberHeader">
                            <div className="memberTitle">
                              <div className="memberName">{title}</div>
                              <div className="memberMeta">
                                <span className={`pill ${complete ? 'ok' : 'warn'}`}>{complete ? '✅ Lengkap' : '⚠️ Belum lengkap'}</span>
                                {m.statusHubunganKeluarga ? <span className="pill neutral">{m.statusHubunganKeluarga}</span> : null}
                              </div>
                            </div>

                            <div className="memberActions">
                              <button onClick={() => toggleMemberOpen(i)} className="btnSoft" type="button">
                                {m._open ? 'Tutup Detail' : 'Isi Detail'}
                              </button>

                              <button onClick={() => removeMember(i)} className="btnDanger" type="button">
                                Hapus
                              </button>
                            </div>
                          </div>

                          <div className="memberBody">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="lbl">Nama Lengkap</label>
                                <input value={m.nama} onChange={e => changeMember(i, 'nama', e.target.value)} className="inp" placeholder="Contoh: BUDI SANTOSO" />
                              </div>

                              <div className="md:col-span-2">
                                <label className="lbl">NIK (16 angka)</label>
                                <input
                                  inputMode="numeric"
                                  value={m.nik}
                                  onChange={e => changeMember(i, 'nik', onlyDigitsMax16(e.target.value))}
                                  className={`inp ${m.nik && m.nik.trim().length !== 16 ? 'inpErr' : ''}`}
                                  placeholder="Masukkan 16 angka NIK"
                                />
                                {m.nik && m.nik.trim().length !== 16 && <div className="helpErr">NIK harus 16 angka.</div>}
                              </div>
                            </div>

                            {m._open && (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="lbl">Jenis Kelamin</label>
                                  <select value={m.jenisKelamin || ''} onChange={e => changeMember(i, 'jenisKelamin', e.target.value)} className="inp cursor-pointer">
                                    <option value="">Pilih jenis kelamin</option>
                                    <option value="LAKI-LAKI">LAKI-LAKI</option>
                                    <option value="PEREMPUAN">PEREMPUAN</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="lbl">Agama</label>
                                  <select value={m.agama || ''} onChange={e => changeMember(i, 'agama', e.target.value)} className="inp cursor-pointer">
                                    <option value="">Pilih agama</option>
                                    {AGAMA_OPTIONS.map(a => (
                                      <option key={a} value={a}>
                                        {a}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <label className="lbl">Status Hubungan dalam Keluarga</label>
                                  <select
                                    value={m.statusHubunganKeluarga || ''}
                                    onChange={e => changeMember(i, 'statusHubunganKeluarga', e.target.value)}
                                    className="inp cursor-pointer"
                                  >
                                    <option value="">Pilih status hubungan</option>
                                    {HUBUNGAN_OPTIONS.map(s => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="lbl">Tempat Lahir</label>
                                  <input value={m.tempatLahir || ''} onChange={e => changeMember(i, 'tempatLahir', e.target.value)} className="inp" placeholder="Contoh: SURABAYA" />
                                </div>

                                <div>
                                  <label className="lbl">Tanggal Lahir</label>
                                  <input type="date" value={m.tanggalLahir || ''} onChange={e => changeMember(i, 'tanggalLahir', e.target.value)} className="inp cursor-pointer" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="emptyBox">
                      <div className="text-gray-700 font-bold mb-1">Belum ada anggota keluarga.</div>
                      <div className="text-gray-600 text-sm mb-3">
                        Klik tombol <b>“Tambah Anggota Keluarga”</b> untuk mulai mengisi.
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button onClick={prevStep} className="flex-1 bg-gray-500 text-white py-4 rounded-lg font-bold hover:bg-gray-600 transition shadow" type="button">
                    ← Kembali (Edit KTP)
                  </button>
                  <button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting || !kkHeader.noKK}
                    className="flex-[2] bg-indigo-700 text-white py-4 rounded-lg font-bold shadow-lg hover:bg-indigo-800 disabled:bg-gray-400 transition transform hover:-translate-y-1"
                    type="button"
                  >
                    {isSubmitting ? '🚀 Sedang Mengirim Data...' : '✓ SIMPAN SEMUA DATA'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <style jsx>{`
          .lbl { display: block; font-size: 0.85rem; font-weight: 700; color: #374151; margin-bottom: 6px; }
          .inp { width: 100%; padding: 12px 12px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #111827; font-weight: 600; transition: all 0.2s; }
          .inp:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12); }
          .inpErr { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12); }
          .helpErr { margin-top: 6px; font-size: 0.8rem; font-weight: 700; color: #b91c1c; }

          .animate-fade-in { animation: fadeIn 0.4s ease-out; }
          .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          .memberCard {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            background: #fff;
            overflow: hidden;
            margin-bottom: 12px;
            box-shadow: 0 1px 0 rgba(0,0,0,.02);
          }
          .memberCard.open {
            border-color: #c7d2fe;
            box-shadow: 0 6px 18px rgba(79,70,229,.08);
          }
          .memberHeader {
            padding: 14px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: linear-gradient(to right, #ffffff, #fafafa);
            border-bottom: 1px solid #f3f4f6;
          }
          .memberTitle { flex: 1; min-width: 0; }
          .memberName { font-weight: 900; color: #111827; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .memberMeta { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 8px; }
          .pill {
            font-size: 0.75rem;
            font-weight: 900;
            padding: 5px 10px;
            border-radius: 999px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            color: #374151;
          }
          .pill.ok { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
          .pill.warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
          .pill.neutral { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }

          .memberActions { display: flex; gap: 10px; }
          .btnSoft {
            background: #ffffff;
            border: 1px solid #d1d5db;
            color: #111827;
            font-weight: 900;
            padding: 10px 12px;
            border-radius: 10px;
            transition: .15s;
            min-width: 120px;
          }
          .btnSoft:hover { background: #f9fafb; }
          .btnDanger {
            background: #fff;
            border: 1px solid #fecaca;
            color: #b91c1c;
            font-weight: 900;
            padding: 10px 12px;
            border-radius: 10px;
            transition: .15s;
          }
          .btnDanger:hover { background: #fef2f2; }

          .memberBody { padding: 14px 14px; }
          .emptyBox {
            padding: 16px;
            border: 1px dashed #d1d5db;
            border-radius: 12px;
            background: #fff;
            text-align: center;
          }
        `}</style>
      </div>
    </main>
  );
}
