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
  pendidikanTerakhir: string;
}

interface InitialFormData {
  namaLengkap: string;
  noHp: string;
  noBpjsTk: string;
  email: string;
  agama: string;
  namaBank: string;
  noRekening: string;
  pendidikanTerakhir: string;
  tanggalLahir: string;
  tempatLahir: string;
  domisili: string;
  provinsi: string;
  kabKota: string;
  kecamatan: string;
  desaKelurahan: string;
  kodePos: string;
}

// --- HELPER ---
const EMPTY_KTP_DATA: KTPData = {
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
};

const REQUIRED_KTP_FIELDS: (keyof KTPData)[] = [
  'nik', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin',
  'alamat', 'rtRw', 'kelDesa', 'kecamatan', 'agama',
  'statusPerkawinan', 'pekerjaan', 'kewarganegaraan',
];

const KTP_FIELD_LABELS: Record<keyof KTPData, string> = {
  nik: 'NIK',
  nama: 'Nama Lengkap',
  tempatLahir: 'Tempat Lahir',
  tanggalLahir: 'Tanggal Lahir',
  jenisKelamin: 'Jenis Kelamin',
  alamat: 'Alamat',
  rtRw: 'RT/RW',
  kelDesa: 'Kel/Desa',
  kecamatan: 'Kecamatan',
  agama: 'Agama',
  statusPerkawinan: 'Status Perkawinan',
  pekerjaan: 'Pekerjaan',
  kewarganegaraan: 'Kewarganegaraan',
};

const JENIS_KELAMIN_OPTIONS = ['LAKI-LAKI', 'PEREMPUAN'];
const AGAMA_OPTIONS = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'KEPERCAYAAN TERHADAP TUHAN YME'];
const STATUS_PERKAWINAN_OPTIONS = ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI'];
const EDUCATION_OPTIONS = [
  ['TIDAK / BELUM SEKOLAH', 'TIDAK / BELUM SEKOLAH'],
  ['BELUM TAMAT SD/SEDERAJAT', 'BELUM TAMAT SD/SEDERAJAT'],
  ['SD', 'TAMAT SD / SEDERAJAT'],
  ['SLTP/SEDERAJAT', 'SLTP/SEDERAJAT'],
  ['SLTA / SEDERAJAT', 'SLTA / SEDERAJAT'],
  ['DIPLOMA I / II', 'DIPLOMA I / II'],
  ['AKADEMI / DIPLOMA III / SARJANA MUDA', 'AKADEMI / DIPLOMA III / SARJANA MUDA'],
  ['DIPLOMA IV / STRATA I', 'DIPLOMA IV / STRATA I'],
  ['STRATA II', 'STRATA II'],
  ['STRATA III', 'STRATA III'],
];

const STEP_ITEMS = [
  { id: 1, label: 'Data Diri', shortLabel: 'Diri', caption: 'Profil awal' },
  { id: 2, label: 'Data KTP', shortLabel: 'KTP', caption: 'Scan dan koreksi' },
  { id: 3, label: 'Data KK', shortLabel: 'KK', caption: 'Finalisasi' },
];

const KTP_SELECT_OPTIONS: Partial<Record<keyof KTPData, string[]>> = {
  jenisKelamin: JENIS_KELAMIN_OPTIONS,
  agama: AGAMA_OPTIONS,
  statusPerkawinan: STATUS_PERKAWINAN_OPTIONS,
};

function isFilled(v: any) {
  if (typeof v !== 'string') return false;

  const value = v.trim();
  if (!value) return false;

  return !['-', '--', '---', 'N/A', 'NA', 'NULL', 'UNDEFINED', 'TIDAK DITEMUKAN', 'TIDAK TERBACA'].includes(value.toUpperCase());
}

function isValidKtpField(field: keyof KTPData, value: string) {
  if (!isFilled(value)) return false;

  const options = KTP_SELECT_OPTIONS[field];
  if (!options) return true;

  return options.includes(value.trim().toUpperCase());
}

function normalizeKtpData(data: Partial<KTPData> | null | undefined): KTPData {
  return {
    ...EMPTY_KTP_DATA,
    ...Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : ''])
    ),
  };
}

function buildKtpErrors(data: KTPData): Partial<Record<keyof KTPData, string>> {
  return REQUIRED_KTP_FIELDS.reduce<Partial<Record<keyof KTPData, string>>>((acc, field) => {
    if (!isValidKtpField(field, data[field])) {
      acc[field] = `${KTP_FIELD_LABELS[field]} wajib diisi.`;
    }
    return acc;
  }, {});
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
  const [ktpData, setKtpData] = useState<KTPData>(EMPTY_KTP_DATA);
  const [ktpErrors, setKtpErrors] = useState<Partial<Record<keyof KTPData, string>>>({});

  const [kkHeader, setKkHeader] = useState<KKHeader>({
    noKK: '',
    pendidikanTerakhir: '',
  });

  const [initialForm, setInitialForm] = useState<InitialFormData>({
    namaLengkap: '',
    noHp: '',
    noBpjsTk: '',
    email: '',
    agama: '',
    namaBank: '',
    noRekening: '',
    pendidikanTerakhir: '',
    tanggalLahir: '',
    tempatLahir: '',
    domisili: '',
    provinsi: '',
    kabKota: '',
    kecamatan: '',
    desaKelurahan: '',
    kodePos: '',
  });
  const currentStep = STEP_ITEMS.find((item) => item.id === step) ?? STEP_ITEMS[0];

  // --- HANDLERS KTP (IMAGE ONLY) ---
  const handleFileKTP = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileKTP(f);
      setPreviewKTP(URL.createObjectURL(f));
      setShowKtpForm(false);
      setKtpErrors({});
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
        const nextKtpData = normalizeKtpData(json.data);
        setKtpData(nextKtpData);
        setKtpErrors(buildKtpErrors(nextKtpData));
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
  const changeInitialForm = (e: any) => setInitialForm({ ...initialForm, [e.target.name]: e.target.value });
  const changeInitialFormNumeric = (e: any) => {
    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
    setInitialForm({ ...initialForm, [e.target.name]: onlyNums });
  };
  const changeKTP = (e: any) => {
    const field = e.target.name as keyof KTPData;
    const value = e.target.value;

    setKtpData({ ...ktpData, [field]: value });
    setKtpErrors((prev) => {
      if (!prev[field] || !isValidKtpField(field, value)) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  const changeKKHead = (e: any) => setKkHeader({ ...kkHeader, [e.target.name]: e.target.value });

  const ktpInputClass = (field: keyof KTPData, extra = '') => {
    return `inp${extra ? ` ${extra}` : ''}${ktpErrors[field] ? ' inp-error' : ''}`;
  };

  const ktpErrorText = (field: keyof KTPData) => {
    return ktpErrors[field] ? <p className="field-error">{ktpErrors[field]}</p> : null;
  };

  const nextStepFormToKtp = () => {
    // Basic validation for initial form
    const requiredInitials: (keyof InitialFormData)[] = [
      'namaLengkap', 'noHp', 'email', 'agama', 'namaBank', 'noRekening', 'pendidikanTerakhir', 
      'tanggalLahir', 'tempatLahir', 'domisili', 'provinsi', 
      'kabKota', 'kecamatan', 'desaKelurahan', 'kodePos'
    ];
    for (const key of requiredInitials) {
      if (!isFilled(initialForm[key])) {
        alert(`Field "${key}" di Form Awal wajib diisi.`);
        return;
      }
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const nextStepKtpToKk = () => {
    const errors = buildKtpErrors(ktpData);
    const firstErrorField = REQUIRED_KTP_FIELDS.find((field) => errors[field]);

    if (firstErrorField) {
      setKtpErrors(errors);
      alert(`Field KTP "${KTP_FIELD_LABELS[firstErrorField]}" wajib diisi.`);
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement | null;
        el?.focus();
      }, 0);
      return;
    }

    if (!fileKTP) {
      alert('File KTP wajib diupload.');
      return;
    }

    setStep(3);
    window.scrollTo(0, 0);
  };

  const prevStep = (toStep: number) => {
    setStep(toStep);
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
      form: initialForm,
      ktp: ktpData,
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
    <main className="min-h-dvh bg-slate-100 px-3 py-4 text-slate-950 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:mb-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Input Data Karyawan</p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-950 sm:text-2xl">
                {currentStep.label}
              </h1>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              Langkah {step} dari 3
            </div>
          </div>
        </header>

        <nav className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3" aria-label="Progress form">
          {STEP_ITEMS.map((item) => {
            const isActive = step === item.id;
            const isDone = step > item.id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-3 transition ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-extrabold ${
                    isActive ? 'bg-white text-blue-700' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.id}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">
                      <span className="sm:hidden">{item.shortLabel}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </p>
                    <p className={`hidden truncate text-xs sm:block ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{item.caption}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* --- STEP 1: INITIAL FORM --- */}
        {step === 1 && (
          <section className="section-panel animate-fade-in animate-slide-up">
            <div className="section-head">
              <h2>Form Data Diri</h2>
              <span>{currentStep.caption}</span>
            </div>
            <div className="form-grid mb-6">
              <div className="col-span-1 md:col-span-2">
                <label className="lbl">Nama Lengkap</label>
                <input name="namaLengkap" value={initialForm.namaLengkap} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">No HP</label>
                <input name="noHp" value={initialForm.noHp} onChange={changeInitialFormNumeric} className="inp" required inputMode="numeric" />
              </div>
              <div>
                <label className="lbl">Email</label>
                <input name="email" value={initialForm.email} onChange={changeInitialForm} className="inp" required type="email" />
              </div>
              <div>
                <label className="lbl">Agama</label>
                <select name="agama" value={initialForm.agama} onChange={changeInitialForm} className="inp cursor-pointer" required>
                  <option value="">-- Pilih --</option>
                  {AGAMA_OPTIONS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Nama Bank</label>
                <input name="namaBank" value={initialForm.namaBank} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">No Rekening</label>
                <input name="noRekening" value={initialForm.noRekening} onChange={changeInitialFormNumeric} className="inp" required inputMode="numeric" />
              </div>
              <div>
                <label className="lbl">Pendidikan Terakhir</label>
                <select name="pendidikanTerakhir" value={initialForm.pendidikanTerakhir} onChange={changeInitialForm} className="inp cursor-pointer" required>
                  <option value="">-- Pilih --</option>
                  {EDUCATION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Tanggal Lahir</label>
                <input name="tanggalLahir" value={initialForm.tanggalLahir} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">Tempat Lahir</label>
                <input name="tempatLahir" value={initialForm.tempatLahir} onChange={changeInitialForm} className="inp" required />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="lbl">Domisili Saat Ini</label>
                <textarea name="domisili" value={initialForm.domisili} onChange={changeInitialForm} className="inp" rows={2} required />
              </div>
              <div>
                <label className="lbl">Provinsi</label>
                <input name="provinsi" value={initialForm.provinsi} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">Kabupaten/Kota</label>
                <input name="kabKota" value={initialForm.kabKota} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">Kecamatan</label>
                <input name="kecamatan" value={initialForm.kecamatan} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">Desa/Kelurahan</label>
                <input name="desaKelurahan" value={initialForm.desaKelurahan} onChange={changeInitialForm} className="inp" required />
              </div>
              <div>
                <label className="lbl">Kode Pos</label>
                <input name="kodePos" value={initialForm.kodePos} onChange={changeInitialFormNumeric} className="inp" required inputMode="numeric" />
              </div>
              <div>
                <label className="lbl">Nomor BPJS TK (jika masih terdapat ada saldo JHT)</label>
                <input name="noBpjsTk" value={initialForm.noBpjsTk} onChange={changeInitialFormNumeric} className="inp" inputMode="numeric" />
              </div>
            </div>
            <div className="mobile-action-bar justify-end">
              <button onClick={nextStepFormToKtp} className="btn btn-primary w-full md:w-auto">
                Lanjut ke Foto KTP
              </button>
            </div>
          </section>
        )}

        {/* --- STEP 2: KTP --- */}
        {step === 2 && (
          <section className="animate-fade-in space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="upload-panel upload-panel-blue">
                <label className="upload-label">Upload Foto KTP</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileKTP}
                  className="file-input"
                  required
                />
                <button
                  onClick={uploadKTP}
                  disabled={!fileKTP || loadingKTP}
                  className="btn btn-primary w-full"
                >
                  {loadingKTP ? 'Sedang Memproses...' : 'Unggah KTP Sekarang'}
                </button>
              </div>

              {previewKTP && (
                <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner sm:h-56 lg:h-full lg:min-h-56">
                  <Image src={previewKTP} alt="Preview KTP" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>

            {showKtpForm && (
              <div className="section-panel animate-slide-up">
                <div className="section-head">
                  <h2>Data KTP</h2>
                  <span>Koreksi hasil OCR</span>
                </div>

                <div className="form-grid mb-6">
                  {/* Inputs KTP (Sama seperti sebelumnya) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="lbl">NIK</label>
                    <input name="nik" value={ktpData.nik} onChange={changeKTP} className={ktpInputClass('nik', 'font-bold tracking-wide')} required inputMode="numeric" />
                    {ktpErrorText('nik')}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="lbl">Nama Lengkap</label>
                    <input name="nama" value={ktpData.nama} onChange={changeKTP} className={ktpInputClass('nama')} required />
                    {ktpErrorText('nama')}
                  </div>
                  <div>
                    <label className="lbl">Tempat Lahir</label>
                    <input name="tempatLahir" value={ktpData.tempatLahir} onChange={changeKTP} className={ktpInputClass('tempatLahir')} required />
                    {ktpErrorText('tempatLahir')}
                  </div>
                  <div>
                    <label className="lbl">Tanggal Lahir</label>
                    <input name="tanggalLahir" value={ktpData.tanggalLahir} onChange={changeKTP} className={ktpInputClass('tanggalLahir', 'cursor-pointer')} required />
                    {ktpErrorText('tanggalLahir')}
                  </div>
                  <div>
                    <label className="lbl">Jenis Kelamin</label>
                    <select name="jenisKelamin" value={ktpData.jenisKelamin} onChange={changeKTP} className={ktpInputClass('jenisKelamin', 'cursor-pointer')} required>
                      <option value="">-- Pilih --</option>
                      {JENIS_KELAMIN_OPTIONS.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    {ktpErrorText('jenisKelamin')}
                  </div>
                  <div>
                    <label className="lbl">Agama</label>
                    <select name="agama" value={ktpData.agama} onChange={changeKTP} className={ktpInputClass('agama', 'cursor-pointer')} required>
                      <option value="">-- Pilih --</option>
                      {AGAMA_OPTIONS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    {ktpErrorText('agama')}
                  </div>
                  <div>
                    <label className="lbl">Status Perkawinan</label>
                    <select name="statusPerkawinan" value={ktpData.statusPerkawinan} onChange={changeKTP} className={ktpInputClass('statusPerkawinan', 'cursor-pointer')} required>
                      <option value="">-- Pilih --</option>
                      {STATUS_PERKAWINAN_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {ktpErrorText('statusPerkawinan')}
                  </div>
                  <div>
                    <label className="lbl">Pekerjaan</label>
                    <input name="pekerjaan" value={ktpData.pekerjaan} onChange={changeKTP} className={ktpInputClass('pekerjaan')} required />
                    {ktpErrorText('pekerjaan')}
                  </div>
                  <div className="col-span-1 md:col-span-2 mt-2">
                    <label className="lbl">Alamat (Sesuai KTP)</label>
                    <textarea name="alamat" value={ktpData.alamat} onChange={changeKTP} className={ktpInputClass('alamat')} rows={2} required />
                    {ktpErrorText('alamat')}
                  </div>
                  <div>
                    <label className="lbl">RT/RW</label>
                    <input name="rtRw" value={ktpData.rtRw} onChange={changeKTP} className={ktpInputClass('rtRw')} required />
                    {ktpErrorText('rtRw')}
                  </div>
                  <div>
                    <label className="lbl">Kel/Desa</label>
                    <input name="kelDesa" value={ktpData.kelDesa} onChange={changeKTP} className={ktpInputClass('kelDesa')} required />
                    {ktpErrorText('kelDesa')}
                  </div>
                  <div>
                    <label className="lbl">Kecamatan</label>
                    <input name="kecamatan" value={ktpData.kecamatan} onChange={changeKTP} className={ktpInputClass('kecamatan')} required />
                    {ktpErrorText('kecamatan')}
                  </div>
                  <div>
                    <label className="lbl">Kewarganegaraan</label>
                    <input name="kewarganegaraan" value={ktpData.kewarganegaraan} onChange={changeKTP} className={ktpInputClass('kewarganegaraan')} required />
                    {ktpErrorText('kewarganegaraan')}
                  </div>
                </div>

                <div className="mobile-action-bar justify-between md:justify-end">
                  <button onClick={() => prevStep(1)} className="btn btn-secondary w-full md:w-auto">
                    Kembali
                  </button>
                  <button onClick={nextStepKtpToKk} className="btn btn-primary w-full md:w-auto">
                    Lanjut ke KK
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* --- STEP 3: KK (IMAGE & PDF SUPPORT) --- */}
        {step === 3 && (
          <section className="animate-fade-in space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="upload-panel upload-panel-green">
                <label className="upload-label">Upload KK (Foto / PDF)</label>

                {/* ACCEPT IMAGE + PDF */}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileKK}
                  className="file-input"
                  required
                />

                <button
                  onClick={uploadKK}
                  disabled={!fileKK || loadingKK}
                  className="btn btn-success w-full"
                >
                  {loadingKK ? 'Sedang Memproses...' : 'Unggah KK Sekarang'}
                </button>
              </div>

              {/* LOGIC PREVIEW KK (Handle PDF UI vs Image UI) */}
              {(previewKK || isPdfKK) && (
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner sm:h-56 lg:h-full lg:min-h-56">
                  {isPdfKK ? (
                    <div className="text-center p-4">
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
              <div className="section-panel animate-slide-up">
                <div className="section-head">
                  <h2>Data KK</h2>
                  <span>Nomor keluarga</span>
                </div>

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
                      {EDUCATION_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TOMBOL MENUMPUK DI MOBILE (flex-col-reverse agar tombol simpan tetap di bawah atau order diatur) */}
                <div className="mobile-action-bar flex-col md:flex-row">
                  <button
                    onClick={() => prevStep(2)}
                    className="btn btn-secondary order-2 flex-1 md:order-1"
                    type="button"
                  >
                    Kembali ke KTP
                  </button>
                  <button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting || !kkHeader.noKK || !kkHeader.pendidikanTerakhir}
                    className="btn btn-primary order-1 flex-[2] md:order-2"
                    type="button"
                  >
                    {isSubmitting ? 'Sedang Mengirim Data...' : 'Simpan Semua Data'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* CSS: Font size 16px pada .inp penting agar iOS tidak auto-zoom saat input diklik */}
        <style jsx>{`
          /* Hallmark - macrostructure: Mobile-first workflow - tone: quiet operational - anchor hue: blue */
          .section-panel {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #ffffff;
            padding: 16px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
          }
          .section-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section-head h2 {
            margin: 0;
            color: #0f172a;
            font-size: 1rem;
            font-weight: 800;
            line-height: 1.25;
          }
          .section-head span {
            flex-shrink: 0;
            border-radius: 6px;
            background: #f1f5f9;
            color: #475569;
            font-size: 0.75rem;
            font-weight: 800;
            padding: 6px 8px;
          }
          .form-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
          }
          .lbl {
            display: block;
            color: #334155;
            font-size: 0.8rem;
            font-weight: 800;
            line-height: 1.25;
            margin-bottom: 6px;
          }
          .inp {
            width: 100%;
            min-height: 48px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #ffffff;
            color: #0f172a;
            font-size: 16px;
            font-weight: 650;
            line-height: 1.4;
            padding: 12px;
            transition: border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
          }
          textarea.inp {
            min-height: 92px;
            resize: vertical;
          }
          .inp:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
          }
          .inp-error {
            border-color: #dc2626;
            background: #fef2f2;
          }
          .inp-error:focus {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
          }
          .field-error {
            margin-top: 6px;
            color: #dc2626;
            font-size: 0.75rem;
            font-weight: 800;
          }
          .upload-panel {
            border: 1px solid #dbeafe;
            border-radius: 8px;
            background: #ffffff;
            padding: 16px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
          }
          .upload-panel-blue {
            border-color: #bfdbfe;
            background: #eff6ff;
          }
          .upload-panel-green {
            border-color: #bbf7d0;
            background: #f0fdf4;
          }
          .upload-label {
            display: block;
            color: #0f172a;
            font-size: 0.95rem;
            font-weight: 850;
            margin-bottom: 12px;
          }
          .file-input {
            display: block;
            width: 100%;
            margin-bottom: 12px;
            color: #475569;
            font-size: 0.875rem;
            font-weight: 700;
          }
          .file-input::file-selector-button {
            border: 0;
            border-radius: 6px;
            background: #ffffff;
            color: #1d4ed8;
            cursor: pointer;
            font-weight: 850;
            margin-right: 12px;
            padding: 10px 12px;
          }
          .btn {
            min-height: 48px;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 850;
            padding: 12px 18px;
            transition: transform 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
          }
          .btn:hover {
            transform: translateY(-1px);
          }
          .btn:active {
            transform: translateY(0);
          }
          .btn:focus-visible {
            outline: 3px solid rgba(37, 99, 235, 0.32);
            outline-offset: 2px;
          }
          .btn:disabled {
            background: #cbd5e1;
            color: #64748b;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .btn-primary {
            background: #1d4ed8;
            color: #ffffff;
            box-shadow: 0 10px 18px rgba(29, 78, 216, 0.18);
          }
          .btn-primary:hover {
            background: #1e40af;
          }
          .btn-success {
            background: #15803d;
            color: #ffffff;
            box-shadow: 0 10px 18px rgba(21, 128, 61, 0.16);
          }
          .btn-success:hover {
            background: #166534;
          }
          .btn-secondary {
            background: #475569;
            color: #ffffff;
          }
          .btn-secondary:hover {
            background: #334155;
          }
          .mobile-action-bar {
            display: flex;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          .animate-fade-in {
            animation: fadeIn 0.24s ease-out;
          }
          .animate-slide-up {
            animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @media (max-width: 767px) {
            .section-head {
              align-items: flex-start;
              flex-direction: column;
            }
            .section-head span {
              max-width: 100%;
            }
          }
          @media (min-width: 768px) {
            .section-panel {
              padding: 24px;
            }
            .form-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px 20px;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-fade-in,
            .animate-slide-up,
            .btn,
            .inp {
              animation: none;
              transition-duration: 0.01ms;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </main>
  );
}
