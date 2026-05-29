// ============================================================
// PENGAWAS KBC - Definisi Form Dinamis (YAML)
// ============================================================
// File ini berisi definisi form instrumen pengawasan.
// Anda dapat menambahkan form baru mengikuti pola yang sama.
//
// POLA UMUM setiap form:
//   title: "Judul Form"
//   description: "Deskripsi singkat"
//   icon: "📋"
//   group: "Nama Grup (untuk pengelompokan di UI)"
//   questions:
//     - type: header
//       text: "Judul Seksi"
//     - type: text
//       name: nama_field        # identifier unik, digunakan sebagai key data
//       label: "Label Field"
//       required: true
//     - type: likert_scale
//       name: nama_likert
//       label: "Pernyataan..."
//       options: [Sangat Tidak Setuju, Tidak Setuju, Setuju, Sangat Setuju]
//     - type: textarea
//       name: nama_textarea
//       label: "Uraian..."
//       rows: 4
//
// TIPE FIELD YANG TERSEDIA:
//   header, note, spacer, text, textarea, radio, select, checkbox,
//   integer, likert_scale, text_block, multi_image, multi_file
// ============================================================

const FormsPengawas = {

  // ==========================================================
  // FORM 1: ANGKET KEPALA MADRASAH
  // Diadaptasi dari instrumen Madrasah KBC
  // Anda dapat menduplikasi dan memodifikasi sesuai kebutuhan
  // ==========================================================
  'instrumen_angket_kamad': `
title: "Instrumen Angket Kepala Madrasah"
description: "Instrumen untuk menilai kompetensi dan karakter kepala madrasah melalui self-assessment."
icon: "👔"
group: "Angket"
questions:
  - type: header
    text: "A. PETUNJUK UMUM"
    level: 2
    align: left
    margin: small
  - type: note
    label: "1. Bacalah setiap pernyataan dengan cermat."
    align: left
    margin: none
  - type: note
    label: "2. Pilih jawaban yang paling sesuai dengan kondisi Anda."
    align: left
    margin: none
  - type: note
    label: "3. Tidak ada jawaban benar atau salah. Harap menjawab dengan jujur."
    align: left
    margin: none
  - type: note
    label: "4. Untuk pertanyaan uraian, tuliskan jawaban secara singkat dan jelas."
    align: left
    margin: none
  - type: spacer
    height: "30px"
    line: false

  - type: header
    text: "B. IDENTITAS RESPONDEN"
    level: 2
    align: left
    margin: small

  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    required: true

  - type: text
    name: nama_kamad
    label: "Nama Kepala Madrasah"
    required: true

  - type: radio
    name: jenis_kelamin
    label: "Jenis Kelamin"
    options:
      - Pria
      - Wanita
    required: true

  - type: spacer
    height: "30px"
    line: false

  - type: header
    text: "C. INSTRUMEN PENILAIAN"
    level: 2
    align: left
    margin: small

  - type: likert_scale
    name: 01_Spiritual_1_1_1
    label: "1. Dalam tujuh hari terakhir, saya merasa kurang diberikan kebaikan oleh Allah di berbagai momen/peristiwa/keadaan."
    label_size: medium
    options:
      - Sangat Tidak Setuju
      - Tidak Setuju
      - Setuju
      - Sangat Setuju

  - type: likert_scale
    name: 02_Spiritual_1_2
    label: "2. Saya mengungkapkan rasa syukur pada Allah dan terima kasih pada sesama atas nikmat/kebaikan yang saya terima."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: textarea
    name: 03_Spiritual_1_1_2
    label: "3. Sebutkan satu nikmat/kebaikan yang Anda terima dalam 2 minggu terakhir dan apa yang Anda lakukan untuk merespon nikmat/kebaikan tersebut."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: likert_scale
    name: 04_Personal_2_2
    label: "4. Saya memikirkan kembali (refleksi) pengalaman dan tindakan saya di madrasah untuk mengidentifikasi yang sudah saya lakukan dengan baik dan yang perlu saya perbaiki."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 05_Intelektual_5_1_1
    label: "5. Saya mengajukan pertanyaan kepada orang lain tentang hal-hal yang saya ingin atau belum ketahui untuk perbaikan diri."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 06_Intelektual_5_1_2
    label: "6. Saya mencari informasi dari berbagai sumber (termasuk internet) untuk memperbaiki praktik kepemimpinan saya sebagai kepala madrasah."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 07_Intelektual_5_1_3
    label: "7. Saya menggunakan informasi yang saya dapatkan untuk memperbaiki praktik kepemimpinan saya sebagai kepala madrasah."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 08_Personal_3_1
    label: "8. Saya menyadari semua emosi (perasaan) saya dalam berbagai situasi."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 09_Personal_3_2
    label: "9. Saya berusaha mengelola emosi (perasaan) dengan cara positif."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 10_Sosial_4_1
    label: "10. Saya dapat mengenali jika ada murid atau orang dewasa di madrasah yang melakukan atau mengalami perundungan atau kekerasan."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 11_Sosial_4_2_1
    label: "11. Jika terjadi perundungan/kekerasan pada murid dan orang dewasa di madrasah, biasanya saya…"
    label_size: medium
    options:
      - Tidak setuju tetapi merasa tidak nyaman untuk bertindak
      - Menegur ringan pelaku
      - Melaporkan ke pihak terkait
      - Menghentikan secara aktif

  - type: textarea
    name: 12_Sosial_4_2_2
    label: "12. Apa saja tindakan perundungan/kekerasan yang pernah Anda alami dan saksikan?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: likert_scale
    name: 13_Ekologis_7_1_1
    label: "13. Saya membangun kesadaran warga madrasah untuk peduli pada lingkungan madrasah (misal kebersihan, keteduhan, keindahan)."
    label_size: medium
    options:
      - Sangat Tidak Setuju
      - Tidak Setuju
      - Setuju
      - Sangat Setuju

  - type: radio
    name: 14_Ekologis_7_1_2
    label: "14. Saya merancang dan menjalankan program peduli lingkungan di madrasah."
    options:
      - Ya
      - Tidak
    required: true

  - type: textarea
    name: 15_Ekologis_7_1_3
    label: "15. Jika ya, program apa yang sudah atau sedang dijalankan di madrasah?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: spacer
    height: "20px"
    line: true

  - type: text_block
    content: "Terima kasih atas partisipasi Anda! Data Anda akan dijaga kerahasiaannya."
    align: left
    size: small
    style: bold
    color: "var(--color-primary)"
    background: "var(--color-bg-elevated)"
    padding: medium
`

  // ==========================================================
  // TAMBAHKAN FORM BARU DI BAWAH INI MENGIKUTI POLA DI ATAS
  // Contoh:
  // 'nama_form_baru': `
  // title: "Judul Form Baru"
  // description: "..."
  // ...
  // `
  // ==========================================================

};

// Injection ke client-side
function getPengawasForms() {
  return FormsPengawas;
}
