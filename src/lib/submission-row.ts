type SubmissionSection = Record<string, unknown>;

type SubmissionPayload = {
  form?: SubmissionSection;
  ktp?: SubmissionSection;
  kk?: SubmissionSection;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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
  const pendidikanTerakhir = text(form.pendidikanTerakhir) || text(kk.pendidikanTerakhir);

  return [
    createdAt,
    text(form.namaLengkap),
    sheetText(form.noHp),
    text(form.email),
    text(form.agama),
    text(form.namaBank),
    sheetText(form.noRekening),
    text(form.pendidikanTerakhir),
    text(form.tanggalLahir),
    text(form.tempatLahir),
    text(form.domisili),
    text(form.provinsi),
    text(form.kabKota),
    text(form.kecamatan),
    text(form.desaKelurahan),
    sheetText(form.kodePos),
    text(form.namaKontak1),
    text(form.hubunganKontak1),
    sheetText(form.noKontak1),
    text(form.namaKontak2),
    text(form.hubunganKontak2),
    sheetText(form.noKontak2),
    sheetText(ktp.nik),
    text(ktp.nama),
    text(ktp.tempatLahir),
    text(ktp.tanggalLahir),
    text(ktp.jenisKelamin),
    text(ktp.alamat),
    sheetText(ktp.rtRw),
    text(ktp.kelDesa),
    text(ktp.kecamatan),
    text(ktp.agama),
    text(ktp.statusPerkawinan),
    text(ktp.pekerjaan),
    text(ktp.kewarganegaraan),
    sheetText(kk.noKK),
    pendidikanTerakhir,
    sheetText(form.noBpjsTk),
    linkKTP,
    linkKK,
  ];
}
