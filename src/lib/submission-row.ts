type SubmissionSection = Record<string, unknown>;

type SubmissionPayload = {
  form?: SubmissionSection;
  ktp?: SubmissionSection;
  kk?: SubmissionSection;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function uppercaseText(value: unknown) {
  return text(value).toUpperCase();
}

function sheetText(value: unknown) {
  const normalized = text(value).replace(/^'+/, '');
  return normalized ? `'${normalized}` : '';
}

export function buildSubmissionRow(
  data: SubmissionPayload,
  createdAt: string,
  linkKTP: string,
  linkKK: string,
) {
  const form = data.form ?? {};
  const ktp = data.ktp ?? {};
  const kk = data.kk ?? {};
  const pendidikanTerakhir = uppercaseText(form.pendidikanTerakhir) || uppercaseText(kk.pendidikanTerakhir);

  return [
    createdAt,
    uppercaseText(form.namaLengkap),
    sheetText(form.noHp),
    text(form.email),
    uppercaseText(form.agama),
    uppercaseText(form.namaBank),
    sheetText(form.noRekening),
    uppercaseText(form.pendidikanTerakhir),
    uppercaseText(form.tanggalLahir),
    uppercaseText(form.tempatLahir),
    uppercaseText(form.domisili),
    uppercaseText(form.provinsi),
    uppercaseText(form.kabKota),
    uppercaseText(form.kecamatan),
    uppercaseText(form.desaKelurahan),
    sheetText(form.kodePos),
    uppercaseText(form.namaKontak1),
    uppercaseText(form.hubunganKontak1),
    sheetText(form.noKontak1),
    uppercaseText(form.namaKontak2),
    uppercaseText(form.hubunganKontak2),
    sheetText(form.noKontak2),
    sheetText(ktp.nik),
    uppercaseText(ktp.nama),
    uppercaseText(ktp.tempatLahir),
    uppercaseText(ktp.tanggalLahir),
    uppercaseText(ktp.jenisKelamin),
    uppercaseText(ktp.alamat),
    sheetText(ktp.rtRw),
    uppercaseText(ktp.kelDesa),
    uppercaseText(ktp.kecamatan),
    uppercaseText(ktp.agama),
    uppercaseText(ktp.statusPerkawinan),
    uppercaseText(ktp.pekerjaan),
    uppercaseText(ktp.kewarganegaraan),
    sheetText(kk.noKK),
    pendidikanTerakhir,
    sheetText(form.noBpjsTk),
    linkKTP,
    linkKK,
  ];
}
