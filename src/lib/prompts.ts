export function buildKtpPrompt(ocrText: string) {
  return `
KAMU ADALAH MESIN EKSTRAKSI DATA KTP INDONESIA.

ATURAN MUTLAK (JIKA DILANGGAR = GAGAL):
- OUTPUT HARUS JSON VALID
- OUTPUT HARUS SATU OBJEK JSON SAJA
- DILARANG menulis penjelasan
- DILARANG menulis kode (Python, JS, dll)
- DILARANG markdown, backtick, atau komentar
- JIKA DATA TIDAK DITEMUKAN, ISI DENGAN STRING KOSONG ""
- FIELD "kewarganegaraan" HARUS SELALU "WNI"

FORMAT OUTPUT (WAJIB PERSIS):

{
  "nik": "",
  "nama": "",
  "tempatLahir": "",
  "tanggalLahir": "",
  "jenisKelamin": "",
  "alamat": "",
  "rtRw": "",
  "kelDesa": "",
  "kecamatan": "",
  "agama": "",
  "statusPerkawinan": "",
  "pekerjaan": "",
  "kewarganegaraan": ""
}

TEKS OCR KTP (MENTAH):
"""
${ocrText}
"""

INGAT: JAWAB DENGAN JSON SAJA.
`;
}


export function buildKkPrompt(ocrText: string) {
  return `
KAMU ADALAH MESIN EKSTRAKSI DATA KARTU KELUARGA (KK) INDONESIA.

ATURAN MUTLAK (JIKA DILANGGAR = GAGAL):
- OUTPUT HARUS JSON VALID
- OUTPUT HARUS SATU OBJEK JSON SAJA
- DILARANG menulis penjelasan
- DILARANG menulis kode (Python, JS, dll)
- DILARANG markdown, backtick, atau komentar
- NOMOR KK HARUS 16 DIGIT ANGKA SAJA (0-9)
- JIKA TIDAK YAKIN / TIDAK DITEMUKAN, ISI DENGAN STRING KOSONG ""

FORMAT OUTPUT (WAJIB PERSIS):

{
  "noKK": ""
}

TEKS OCR KK (MENTAH):
"""
${ocrText}
"""

CATATAN PENTING:
- Cari nomor yang paling mungkin adalah "NO. KARTU KELUARGA" / "NOMOR KK" / "NO."
- Jika ada banyak angka 16 digit, pilih yang paling dekat dengan teks "KARTU KELUARGA" / "NO"
- HANYA kembalikan digitnya saja, tanpa spasi, tanpa tanda baca.

INGAT: JAWAB DENGAN JSON SAJA.
`;
}