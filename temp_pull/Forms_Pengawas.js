// ============================================================
// PENGAWAS KBC - Definisi Form Dinamis (YAML)
// ============================================================
// File ini berisi definisi form instrumen pengawasan mandiri.
// Form di sini diperuntukkan bagi Pengawas sendiri (misalnya untuk
// evaluasi diri atau laporan bulanan) tanpa terikat ke Madrasah.
// ============================================================

const FormsPengawas = {

  // ==========================================================
  // FORM 1: EVALUASI DIRI PENGAWAS (EDP)
  // ==========================================================
  'evaluasi_diri_pengawas': `
title: "Evaluasi Diri Pengawas (EDP)"
description: "Instrumen penilaian mandiri kompetensi pengawas madrasah untuk mengidentifikasi kekuatan dan rencana pengembangan."
icon: "📝"
group: "Evaluasi Diri"
target_sheet: "evaluasi_diri_pengawas"
requires_madrasah: false
questions:
  - type: header
    text: "A. PETUNJUK PENGISIAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "1. Bacalah setiap butir pernyataan dengan cermat."
    align: left
    margin: none
  - type: note
    label: "2. Nilailah diri Anda sendiri secara jujur sesuai dengan kondisi nyata sehari-hari."
    align: left
    margin: none
  - type: spacer
    height: "20px"
    line: false

  - type: header
    text: "B. IDENTITAS PENGAWAS"
    level: 2
    align: left
    margin: small
  - type: text
    name: nip_pengawas
    label: "NIP Pengawas"
    default: "$user_username"
    readonly: true
    width: "100%"
  - type: text
    name: nama_pengawas
    label: "Nama Lengkap"
    default: "$user_fullname"
    readonly: true
    width: "100%"

  - type: header
    text: "C. PENILAIAN KOMPETENSI MANDIRI"
    level: 2
    align: left
    margin: small

  - type: likert_scale
    name: komp_supervisi_akademik
    label: "1. Saya menyusun program pengawasan madrasah berdasarkan analisis hasil pemantauan dan evaluasi tahun sebelumnya."
    label_size: medium
    options:
      - Kurang
      - Cukup
      - Baik
      - Amat Baik

  - type: likert_scale
    name: komp_supervisi_manajerial
    label: "2. Saya melaksanakan pembinaan kepala madrasah dalam pengelolaan dan administrasi madrasah secara terencana."
    label_size: medium
    options:
      - Kurang
      - Cukup
      - Baik
      - Amat Baik

  - type: likert_scale
    name: komp_evaluasi_pendidikan
    label: "3. Saya membimbing guru dalam memanfaatkan hasil penilaian untuk perbaikan mutu pembelajaran."
    label_size: medium
    options:
      - Kurang
      - Cukup
      - Baik
      - Amat Baik

  - type: likert_scale
    name: komp_penelitian_inovasi
    label: "4. Saya menyusun karya tulis ilmiah (KTI) atau melakukan penelitian tindakan pengawasan untuk pemecahan masalah di madrasah binaan."
    label_size: medium
    options:
      - Kurang
      - Cukup
      - Baik
      - Amat Baik

  - type: header
    text: "D. REFLEKSI DAN RENCANA PENGEMBANGAN"
    level: 2
    align: left
    margin: small

  - type: textarea
    name: kekuatan_pengawas
    label: "5. Tuliskan kekuatan utama Anda dalam menjalankan tugas pengawasan:"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    required: true

  - type: textarea
    name: hambatan_pengawas
    label: "6. Tuliskan hambatan atau tantangan terbesar yang Anda hadapi di lapangan:"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    required: true

  - type: textarea
    name: rencana_tindak_lanjut
    label: "7. Rencana tindak lanjut pengembangan kompetensi mandiri yang akan Anda lakukan:"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    required: true
`,

  // ==========================================================
  // FORM 2: LAPORAN BULANAN PENGAWAS
  // ==========================================================
  'laporan_bulanan_pengawas': `
title: "Laporan Kinerja Bulanan Pengawas"
description: "Laporan pertanggungjawaban kegiatan pengawasan, pembinaan guru, pembinaan kepala madrasah yang dilakukan setiap bulan."
icon: "📅"
group: "Laporan Kinerja"
target_sheet: "laporan_bulanan_pengawas"
requires_madrasah: false
questions:
  - type: header
    text: "A. PERIODE LAPORAN"
    level: 2
    align: left
    margin: small

  - type: select
    name: bulan_laporan
    label: "Bulan"
    options:
      - Januari
      - Februari
      - Maret
      - April
      - Mei
      - Juni
      - Juli
      - Agustus
      - September
      - Oktober
      - November
      - Desember
    required: true
    width: "200px"

  - type: integer
    name: tahun_laporan
    label: "Tahun"
    default: 2026
    required: true
    width: "120px"

  - type: header
    text: "B. STATISTIK KEGIATAN BULAN INI"
    level: 2
    align: left
    margin: small

  - type: integer
    name: jumlah_pembinaan_guru
    label: "Jumlah Guru yang Dibina (Orang)"
    min: 0
    required: true
    width: "150px"

  - type: integer
    name: jumlah_pembinaan_kamad
    label: "Jumlah Kepala Madrasah yang Dibina (Orang)"
    min: 0
    required: true
    width: "150px"

  - type: header
    text: "C. URAIAN KEGIATAN & PERKEMBANGAN BINAAN"
    level: 2
    align: left
    margin: small

  - type: textarea
    name: rincian_kegiatan_utama
    label: "1. Uraian rincian kegiatan utama yang dilaksanakan bulan ini:"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true

  - type: textarea
    name: hasil_kegiatan_pembinaan
    label: "2. Hasil utama yang dicapai dan tindak lanjut pengawasan:"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true

  - type: spacer
    height: "20px"
    line: true

  - type: header
    text: "D. BERKAS PENDUKUNG (EVIDENCE)"
    level: 2
    align: left
    margin: small

  - type: multi_file
    name: berkas_laporan
    label: "Upload Berkas Laporan / Foto Kegiatan / Daftar Hadir (Max 5 File)"
    max_files: 5
    max_size: 10
    accept: "all"
`

};

function getPengawasForms() {
  return FormsPengawas;
}
