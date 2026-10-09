import assert from 'node:assert/strict';
import test from 'node:test';
import * as submissionRow from './submission-row.ts';

test('keeps the approved Google Sheets column order', () => {
  const row = submissionRow.buildSubmissionRow?.(
    {
      form: {
        namaLengkap: 'FORM_NAMA',
        noHp: '081000',
        email: 'EMAIL',
        agama: 'AGAMA_FORM',
        namaBank: 'BANK',
        noRekening: '00123',
        pendidikanTerakhir: 'PENDIDIKAN',
        tanggalLahir: 'TANGGAL_LAHIR_FORM',
        tempatLahir: 'TEMPAT_LAHIR_FORM',
        domisili: 'DOMISILI',
        provinsi: 'PROVINSI',
        kabKota: 'KAB_KOTA',
        kecamatan: 'KECAMATAN_FORM',
        desaKelurahan: 'DESA_KELURAHAN',
        kodePos: '01234',
        namaKontak1: 'NAMA_KONTAK_1',
        hubunganKontak1: 'HUBUNGAN_1',
        noKontak1: '082000',
        namaKontak2: 'NAMA_KONTAK_2',
        hubunganKontak2: 'HUBUNGAN_2',
        noKontak2: '083000',
        noBpjsTk: '00999',
      },
      ktp: {
        nik: '123456',
        nama: 'NAMA_KTP',
        tempatLahir: 'TEMPAT_LAHIR_KTP',
        tanggalLahir: 'TANGGAL_LAHIR_KTP',
        jenisKelamin: 'JENIS_KELAMIN',
        alamat: 'ALAMAT_KTP',
        rtRw: '001/002',
        kelDesa: 'KEL_DESA_KTP',
        kecamatan: 'KECAMATAN_KTP',
        agama: 'AGAMA_KTP',
        statusPerkawinan: 'STATUS',
        pekerjaan: 'PEKERJAAN',
        kewarganegaraan: 'WNI',
      },
      kk: { noKK: '987654', pendidikanTerakhir: 'PENDIDIKAN_KK' },
    },
    'TIMESTAMP',
    'LINK_KTP',
    'LINK_KK',
  );

  assert.deepEqual(row, [
    'TIMESTAMP', 'FORM_NAMA', "'081000", 'EMAIL', 'AGAMA_FORM', 'BANK', "'00123",
    'PENDIDIKAN', 'TANGGAL_LAHIR_FORM', 'TEMPAT_LAHIR_FORM', 'DOMISILI', 'PROVINSI',
    'KAB_KOTA', 'KECAMATAN_FORM', 'DESA_KELURAHAN', "'01234", 'NAMA_KONTAK_1',
    'HUBUNGAN_1', "'082000", 'NAMA_KONTAK_2', 'HUBUNGAN_2', "'083000", "'123456", 'NAMA_KTP', 'TEMPAT_LAHIR_KTP',
    'TANGGAL_LAHIR_KTP', 'JENIS_KELAMIN', 'ALAMAT_KTP', "'001/002", 'KEL_DESA_KTP',
    'KECAMATAN_KTP', 'AGAMA_KTP', 'STATUS', 'PEKERJAAN', 'WNI', "'987654",
    'PENDIDIKAN', "'00999", 'LINK_KTP', 'LINK_KK',
  ]);
});

test('uppercases text fields while preserving email', () => {
  const row = submissionRow.buildSubmissionRow?.(
    {
      form: {
        namaLengkap: 'andi pradana',
        email: 'Andi.Pradana@example.com',
        domisili: 'jalan melati',
        namaKontak1: 'siti aminah',
        hubunganKontak1: 'ibu',
        namaKontak2: 'budi pradana',
        hubunganKontak2: 'kakak',
      },
      ktp: {
        nama: 'andi pradana',
        alamat: 'jalan mawar',
      },
      kk: { pendidikanTerakhir: 'diploma iv / strata i' },
    },
    'TIMESTAMP',
    'LINK_KTP',
    'LINK_KK',
  );

  assert.deepEqual(
    [row?.[1], row?.[3], row?.[10], row?.[16], row?.[17], row?.[19], row?.[20], row?.[23], row?.[27], row?.[36]],
    ['ANDI PRADANA', 'Andi.Pradana@example.com', 'JALAN MELATI', 'SITI AMINAH', 'IBU', 'BUDI PRADANA', 'KAKAK', 'ANDI PRADANA', 'JALAN MAWAR', 'DIPLOMA IV / STRATA I'],
  );
});
