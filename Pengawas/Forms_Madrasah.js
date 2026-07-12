/**
 * FORMS CONFIGURATION
 * Edit this file to add or modify surveys.
 * 
 * SCHEMA:
 * - title: Display title of the survey
 * - target_sheet: Name of the sheet to save data to (will be created if missing)
 * - questions: List of fields
 * 
 * FEATURES:
 * - type: text, number, date, time, select, image, audio, gps, note, calculate
 * - required: true/false
 * - readonly: true/false
 * - default: value or ${user.full_name}
 * - regex: regular expression pattern for validation
 * - relevant: boolean logic (e.g. "data.has_building === 'Yes'")
 * - calculate: math expression (e.g. "data.p * data.l")
 */

function getMadrasahFormDefinitions() {
  return {
    'form_personil': `    # FORM 0.1. PERSONIL
title: 0.1. Data Personil
group: 0. Data Madrasah
icon: "🧑‍🏫"
description: "Data Personil dan Guru yang akan ikut Program KBC Inovasi"
submission_limit: 0
target_sheet: 0_1_Personil
enable_delegation: true
questions:
  - type: header
    text: "A. KEPALA MADRASAH"
    level: 2
    align: left
    margin: small
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_kepala
    label: "Nama Kepala Madrasah"
    required: true
  - type: segmented_control
    name: jenis_kelamin
    label: "Jenis Kelamin"
    options:
      - Laki-laki
      - Perempuan
    required: true
  - type: integer
    name: tahun_lahir
    label: "Tahun Lahir"
    min: 1950
    max: 2020
    required: true
    width: "120px"
  - type: segmented_control
    name: pendidikan
    label: "Pendidikan Terakhir"
    options:
      - SMA
      - D3
      - S1/D4
      - S2
      - S3
    required: true
    width: "120px"
  - type: segmented_control
    name: status_pegawai
    label: "Status Kepagawaian"
    options:
      - ASN (PNS/P3K)
      - Non ASN
    required: true
    width: "200px"   
  - type: segmented_control
    name: sertifikasi
    label: "Status Sertifikasi"
    options:
      - Sertifikasi
      - Non Sertifikasi
    required: true
    width: "200px" 
  - type: text
    name: email
    label: "Email"
    regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,10}$"
    width: "350px"
  - type: text
    name: no_hp
    label: "No HP Aktif"
    regex: "^(?:\\\\+62|62|0)8[1-9][0-9]{6,10}$"
    width: "200px"
  - type: header
    text: "B. DATA TENAGA PENDIDIK dan KEPENDIDIKAN"
    level: 2
    align: left
    margin: small
  - type: table_col_fix
    name: guru_jumlah_status
    label: "Jumlah Guru Berdasarkan Kelompok dan Jenis Kelamin"
    first_col_label: Jenis Guru 
    header_font_bold: false      # Non-bold headers
    header_align: "center"
    items:
      - Total
      - ASN (PNS/P3K)
      - Sertifikasi
    columns:
      - name: l
        label: "L"
        type: integer
      - name: p
        label: "P"
        type: integer
  - type: table
    name: daftar_guru
    label: "Daftar Guru yang akan ikut Program KBC Inovasi"
    header_font_bold: false      # Non-bold headers
    header_align: "center"
    columns:
      - name: nama
        label: "Nama Guru"
        type: text
      - name: kelamin
        label: "Kelamin"
        type: select
        options:
          - L
          - P
      - name: mapel
        label: "Mata Pelajaran"
        type: multiselect
        options:
          - Guru Kelas
          - PAI (Quran Hadis, Akidah Akhlak, Fiqih, SKI)
          - PPKN
          - Matematika
          - Ilmu Pengetahuan Alam dan Sosial
          - Bahasa Arab
          - Bahasa Indonesia
          - Bahasa Inggris
          - Pendidikan Jasmani, Olahraga, dan Kesehatan
          - Seni dan Budaya
          - Muatan Lokal
      - name: kelas
        label: "Kelas"
        type: select
        options:
          - 1
          - 2
          - 3
          - 4
          - 5
          - 6
        width: "80px"
`,

    'form_pendampingan_perencanaan': `    # FORM 1.0. PENDAMPINGAN MADRASAH KBC PILOTING
title: 1.1. Perencanaan 
group: 1. Langkah Kerja Pendampingan KBC Piloting
icon: "🎯"
description: "Mencatat hasil observasi awal kondisi madrasah, menyusun jadwal (timeline) pendampingan, dan melakukan refleksi diri sebagai acuan untuk merumuskan rencana aksi implementasi KBC"
submission_limit: 0
target_sheet: 1_1_Perencanaan
allowed_roles:
subordinate_visibility: view
questions:  
  - type: header
    text: "PERENCANAAN PENDAMPINGAN"
    level: 1
    align: center
    margin: small
  - type: spacer
    height: "30px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_kab_prov
    label: "Kab."
    default: "$madrasah_district"
    readonly: true
  - type: text
    name: nama_pengawas
    label: "Nama Pengawas"
    default: "$user_fullname"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Perencanaan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "A. PETUNJUK PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Instrumen ini digunakan untuk merumuskan rencana aksi implementasi KBC."
    align: left
    margin: none
  - type: header
    text: "Aspek Perencanaan Pendampingan"
    level: 3
    align: left
    margin: small
  - type: note
    label: 
      - "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC yang sudah muncul di madrasah."
      - "2.Menyiapkan materi penguatan nilai KBC (lihat materi PPT di link materi pendampingan) dan jika diperlukan memberi pelatihan penguatan nilai KBC."
      - "3.Menyusun rencana pendampingan KBC (menyusun timeline pendampingan)"
      - "4.Melakukan refleksi pendampingan dan menyusun rencana aksi pendampingan di platform MAGIS. Refleksi pengawas meliputi:"
      - "  - Refleksi Pendampingan"
      - "  - Refleksi Kompetensi diri"
    align: left
    margin: none
    indent: 1
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "B. INSTRUMEN PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Dimensi dan Butir Perencanaan Pendampingan"
    align: left
    margin: none
  - type: header
    text: "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada kegiatan observasi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan Observasi"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "2. Menyiapkan materi penguatan nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada penyiapan materi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan penyiapan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "UPLOAD DOKUMEN TAMBAHAN"
    level: 2
    align: left
    margin: small
  - type: multi_file
    name: documents
    label: "Upload"
    max_files: 5
    max_size: 10  # 10 MB limit per file
    accept: "all"
`
    ,
    'form_refleksi_dan_penyusunan_rencana': `    # FORM 1.0. PENDAMPINGAN MADRASAH KBC PILOTING
title: 1.2. Refleksi dan Penyusunan Rencana Aksi 
group: 1. Langkah Kerja Pendampingan KBC Piloting
icon: "🎯"
description: "Mencatat hasil observasi awal kondisi madrasah, menyusun jadwal (timeline) pendampingan, dan melakukan refleksi diri sebagai acuan untuk merumuskan rencana aksi implementasi KBC"
submission_limit: 0
target_sheet: 1_2_Refleksi_dan_Penyusunan_Rencana
allowed_roles:
subordinate_visibility: view
questions:  
  - type: header
    text: "REFLEKSI DAN PENYUSUNAN RENCANA AKSI"
    level: 1
    align: center
    margin: small
  - type: spacer
    height: "30px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_kab_prov
    label: "Kab."
    default: "$madrasah_district"
    readonly: true
  - type: text
    name: nama_pengawas
    label: "Nama Pengawas"
    default: "$user_fullname"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Perencanaan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "A. PETUNJUK PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Instrumen ini digunakan untuk merumuskan rencana aksi implementasi KBC."
    align: left
    margin: none
  - type: header
    text: "Aspek Perencanaan Pendampingan"
    level: 3
    align: left
    margin: small
  - type: note
    label: 
      - "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC yang sudah muncul di madrasah."
    align: left
    margin: none
    indent: 1
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "B. INSTRUMEN PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Dimensi dan Butir Perencanaan Pendampingan"
    align: left
    margin: none
  - type: header
    text: "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada kegiatan observasi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan Observasi"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "2. Menyiapkan materi penguatan nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada penyiapan materi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan penyiapan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "UPLOAD DOKUMEN TAMBAHAN"
    level: 2
    align: left
    margin: small
  - type: multi_file
    name: documents
    label: "Upload"
    max_files: 5
    max_size: 10  # 10 MB limit per file
    accept: "all"
`,
    'form_implementasi_dan_pemantauan': `    # FORM 1.0. PENDAMPINGAN MADRASAH KBC PILOTING
title: 1.3. Implementasi dan Pemantauan
group: 1. Langkah Kerja Pendampingan KBC Piloting
icon: "🎯"
description: "Mencatat hasil observasi awal kondisi madrasah, menyusun jadwal (timeline) pendampingan, dan melakukan refleksi diri sebagai acuan untuk merumuskan rencana aksi implementasi KBC"
submission_limit: 0
target_sheet: 1_3_Implementasi_dan_Pemantauan
allowed_roles:
subordinate_visibility: view
questions:  
  - type: header
    text: "PENDAMPINGAN IMPLEMENTASI KBC"
    level: 1
    align: center
    margin: small
  - type: spacer
    height: "30px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_kab_prov
    label: "Kab."
    default: "$madrasah_district"
    readonly: true
  - type: text
    name: nama_pengawas
    label: "Nama Pengawas"
    default: "$user_fullname"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Perencanaan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "A. PETUNJUK PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Instrumen ini digunakan untuk merumuskan rencana aksi implementasi KBC."
    align: left
    margin: none
  - type: header
    text: "Aspek Perencanaan Pendampingan"
    level: 3
    align: left
    margin: small
  - type: note
    label: 
      - "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC yang sudah muncul di madrasah."
    align: left
    margin: none
    indent: 1
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "B. INSTRUMEN PERENCANAAN PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Dimensi dan Butir Perencanaan Pendampingan"
    align: left
    margin: none
  - type: header
    text: "1.Mencermati/mengobservasi bukti-bukti penanaman nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada kegiatan observasi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan Observasi"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "2. Menyiapkan materi penguatan nilai KBC"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "Ada penyiapan materi"
    options:
      - 0. Belum Dilakukan
      - 1. Sudah Dilakukan 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan penyiapan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "UPLOAD DOKUMEN TAMBAHAN"
    level: 2
    align: left
    margin: small
  - type: multi_file
    name: documents
    label: "Upload"
    max_files: 5
    max_size: 10  # 10 MB limit per file
    accept: "all"
`,
    'form_observasi': `    # FORM 1.0. OBSERVASI FINAL
title: X1.0. Observasi Akhir Penilaian
group: X1. Observasi
icon: "🔍"
description: "Observasi Akhir Penilaian Program KBC Inovasi"
submission_limit: 0
target_sheet: 1_0_Observasi
allowed_roles: [district]
subordinate_visibility: list
questions:  
  - type: header
    text: "LEMBAR OBSERVASI"
    level: 1
    align: center
    margin: small
  - type: spacer
    height: "30px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_kab_prov
    label: "Kab. / Provinsi"
    default: "$madrasah_district / $madrasah_province"
    readonly: true
  - type: date
    name: observasi_date
    label: "Tanggal Observasi"
    default: "$today"
  - type: text
    name: nama_observer
    label: "Nama Observer"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "A. PETUNJUK OBSERVASI"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Instrumen ini digunakan untuk mengamati budaya madrasah melalui perilaku, rutinitas, dan artefak yang terlihat di berbagai zona madrasah."
    align: left
    margin: none
  - type: header
    text: "Zona Observasi"
    level: 3
    align: left
    margin: small
  - type: note
    label: 
      - "1. Ruang kelas"
      - "2. Area luar / halaman / koridor / toilet / kantin"
      - "3. Ruang guru"
      - "4. Ruang kepala madrasah"
      - "5. Area umum / kegiatan bersama (opsional)"
    align: left
    margin: none
    indent: 1
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "B. RUBRIK SKALA OBSERVASI"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Gunakan skala berikut untuk setiap indikator:"
    align: left
    margin: none
  - type: header
    text: "0. Belum Terlihat"
    level: 3
    align: left
    margin: small
    indent: 1
  - type: note
    label: 
      - "● Tidak ada bukti fisik, rutinitas, atau perilaku yang terkait indikator."
      - "● Jika ada poster/artefak, tampak lama, tidak relevan, atau tidak digunakan."
    align: left
    margin: none
    indent: 2
  - type: header
    text: "1. Terlihat"
    level: 3
    align: left
    margin: small
    indent: 1
  - type: note
    label: 
      - "● Terlihat di beberapa titik/ruang dan dijalankan oleh banyak warga madrasah."
      - "● Artefak dan rutinitas tampak diperbarui, dipakai, dan dihidupi."
      - "● Perilaku yang diamati menunjukkan bahwa nilai tersebut telah menjadi kebiasaan kolektif."
    align: left
    margin: none
    indent: 2
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "C. INSTRUMEN OBSERVASI "
    level: 2
    align: left
    margin: small
  - type: note
    label: "Dimensi dan Butir Pernyataan Observasi"
    align: left
    margin: none
  - type: header
    text: "Mencari Informasi untuk Perbaikan"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: refleksi
    label: "1. Ada kegiatan refleksi berkala di madrasah. (Ditunjukkan dari dokumen, seperti jadwal, perencanaan, catatan, dll.)"
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: refleksi_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: segmented_control
    name: pengembangan_diri 
    label: "2. Madrasah mendukung pengembangan diri (anggaran, kegiatan, kebijakan, waktu belajar guru Ditunjukkan dari RKAM, dan dokumen lain yang relevan)"
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: pengembangan_diri_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Hubungan yang Aman"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: bahasa_positif
    label: "3. Warga madrasah berinteraksi dengan cara dan bahasa yang positif dalam pembelajaran, apel, dan interaksi sehari-hari."
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: bahasa_positif_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: segmented_control
    name: media 
    label: "4. Terdapat media di kelas, ruang guru/kamad, dan lingkungan madrasah yang mengajak warga madrasah untuk mengelola emosi serta mencegah/mengatasi perundungan."
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: media_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Kepemimpinan Berwawasan Lingkungan"
    level: 2
    align: left
    margin: small
  - type: segmented_control
    name: lingkungan
    label: "5. Lingkungan madrasah (kelas, halaman, toilet, wudhu) terawat & bersih."
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: lingkungan_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: segmented_control
    name: prilaku 
    label: "5. Perilaku warga madrasah dalam menjaga lingkungan (piket, kerja bakti, penghijauan, pengelolaan sampah) berjalan pada hari kunjungan.
(Ditunjukkan oleh kondisi lingkungan, jadwal, foto/dokumentasi, dll.)"
    options:
      - 0. Belum Terlihat
      - 1. Terlihat 
  - type: textarea
    name: prilaku_catatan
    label: "Catatan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "50px"
    line: true
  - type: header
    text: "UPLOAD DOKUMEN TAMBAHAN"
    level: 2
    align: left
    margin: small
  - type: multi_file
    name: documents
    label: "Upload"
    max_files: 5
    max_size: 10  # 10 MB limit per file
    accept: "all"
`,

    'instrumen_angket_guru': `    ### 2.1. ANGKET GURU ###
title: X2.1. Instrumen Angket Guru
group: X2. Angket
icon: "📝"
description: "Instrumen Angket Guru Program KBC Inovasi"
submission_limit: 4
target_sheet: 2_1_Angket_Guru
enable_delegation: true
allowed_roles: [madrasah]
subordinate_visibility: list
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
    height: "50px"
    line: false
  - type: spacer
    height: "50px"
    line: false
  - type: header
    text: "B. IDENTITAS RESPONDEN"
    level: 2
    align: left
    margin: small
  
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true

  - type: text
    name: nama_guru
    label: "Nama Guru"
    required: true

  - type: radio
    name: jenis_kelamin
    label: "Jenis Kelamin"
    options:
      - Pria
      - Wanita
    required: true
  - type: text
    name: mapel_guru
    label: "Mata pelajaran"
    default: "Guru Kelas"
    readonly: true
    width: "400px"
  - type: select
    name: kelas
    label: "Kelas"
    options:
      - 3
      - 4
      - 5
    required: true
    width: "100px"
  - type: header
    text: "C. INSTRUMEN"
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
    label: "6. Saya mencari informasi dari berbagai sumber (termasuk internet) untuk memperbaiki praktik pembelajaran saya sebagai guru."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 07_Intelektual_5_1_3
    label: "7. Saya menggunakan informasi yang saya dapatkan untuk memperbaiki praktik pembelajaran/mengajar saya sebagai guru."
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
      - Melaporkan ke pihak terkait (kamad, dll)
      - Menghentikan secara aktif

  - type: textarea
    name: 12_Spiritual_4_2_2
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

  - type: likert_scale
    name: 14_Ekologis_7_1_2
    label: "14. Saya membantu murid lebih peduli pada lingkungan di madrasah melalui proses pembelajaran."
    label_size: medium
    options:
      - Tidak
      - Ya

  - type: textarea
    name: 15_Ekologis_7_1_3
    label: "15. Jika ya, bagaimana Anda membantu murid lebih peduli pada lingkungan di madrasah melalui proses pembelajaran?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  # CLOSING MESSAGE
  - type: text_block
    content: "Terima kasih atas partisipasi Anda! Data Anda akan dijaga kerahasiaannya."
    align: left
    size: small
    style: bold
    color: "var(--color-primary)"
    background: "var(--color-bg-elevated)"
    padding: medium
`,

    'instrumen_angket_kamad': `### 2.1. ANGKET KAMAD ###
title: X2.2. Instrumen Angket Kepala Madrasah
group: X2. Angket
icon: "📝"
description: "Instrumen Angket Kepala Madrasah Program KBC Inovasi"
target_sheet: 2_2_Angket_Kamad
enable_delegation: false
allowed_roles: [madrasah]
subordinate_visibility: list
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
    height: "50px"
    line: false
  - type: header
    text: "B. IDENTITAS RESPONDEN"
    level: 2
    align: left
    margin: small
  
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true

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
    height: "50px"
    line: false
  - type: header
    text: "C. INSTRUMEN"
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
    label: "4.  Saya memikirkan kembali (refleksi) pengalaman dan tindakan saya di madrasah untuk mengidentifikasi yang sudah saya lakukan dengan baik dan yang perlu saya perbaiki."
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
    label: "6. Saya mencari informasi dari berbagai sumber (termasuk internet) untuk memperbaiki praktik kepemimpinan saya sebagai kepala madrasah"
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
    name: 12_Spiritual_4_2_2
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

  - type: likert_scale
    name: 14_Ekologis_7_1_2
    label: "14. Saya merancang dan menjalankan program peduli lingkungan di madrasah."
    label_size: medium
    options:
      - Tidak
      - Ya

  - type: textarea
    name: 15_Ekologis_7_1_3
    label: "15. Jika ya, program apa yang sudah atau sedang dijalankan di madrasah?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  # CLOSING MESSAGE
  - type: text_block
    content: "Terima kasih atas partisipasi Anda! Data Anda akan dijaga kerahasiaannya."
    align: left
    size: small
    style: bold
    color: "var(--color-primary)"
    background: "var(--color-bg-elevated)"
    padding: medium
`,

    'instrumen_angket_ortu': `### 2.1. ANGKET ORTU ###
title: X2.3. Instrumen Angket Orang Tua
group: X2. Angket
icon: "👨‍👩‍👧‍👦"
description: "Instrumen Angket Orang Tua Program KBC Inovasi"
submission_limit: 4
target_sheet: 2_2_Angket_Ortu
enable_delegation: true
allowed_roles: [madrasah]
subordinate_visibility: list
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
    height: "50px"
    line: false
  - type: header
    text: "B. IDENTITAS RESPONDEN"
    level: 2
    align: left
    margin: small
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: nama_anak
    label: "Nama Murid"
    required: true
    description: "Masukkan nama anak yang bersekolah di Madrasah ini"
  - type: text
    name: nama_ortu
    label: "Nama Orang Tua / Wali"
    required: true
    description: "Masukkan nama Orang Tua / Wali murid"
  - type: radio
    name: jenis_kelamin
    label: "Jenis Kelamin"
    options:
      - Pria
      - Wanita
    required: true
    description: "Jenis kelamin dari orang tua / responden"
  - type: select
    name: kelas
    label: "Kelas Anak"
    options:   
      - 3
      - 4
      - 5
    required: true
    width: "100px"
  - type: text
    name: pekerjaan_ortu
    label: "Pekerjaan Orang Tua"
    required: true
  - type: spacer
    height: "50px"
    line: false

  - type: header
    text: "C. INSTRUMEN"
    level: 2
    align: left
    margin: small

  - type: likert_scale
    name: 01_Spiritual_1_2_1
    label: "1. Saya mengungkapkan rasa syukur pada Allah dan terima kasih pada sesama atas nikmat/kebaikan yang saya terima."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: textarea
    name: 02_Spiritual_1_1_2
    label: "2. Sebutkan satu nikmat/kebaikan yang Anda terima dalam 2 minggu terakhir dan apa yang Anda lakukan untuk merespon nikmat/kebaikan tersebut."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: likert_scale
    name: 02_Spiritual_1_2
    label: "2. Saya mengungkapkan rasa syukur pada Allah dan terima kasih pada sesama atas nikmat/kebaikan yang saya terima."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 03_Intelektual_6_1
    label: "3. Saya mencari informasi tentang hal yang ingin atau belum saya ketahui untuk perbaikan diri."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  - type: likert_scale
    name: 04_Personal_3_2
    label: "4. Saya berusaha mengendalikan emosi dalam mendisiplinkan anak."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu
  
  - type: likert_scale
    name: 05_Ekologis_7_1
    label: "5. Saya memberi contoh kepada anak untuk peduli lingkungan di rumah (seperti: menjaga kebersihan, hemat air dan listrik, dll.)."
    label_size: medium
    options:
      - Jarang
      - Kadang-kadang
      - Sering
      - Hampir Selalu

  # CLOSING MESSAGE
  - type: text_block
    content: "Terima kasih atas partisipasi Anda! Data Anda akan dijaga kerahasiaannya."
    align: left
    size: small
    style: bold
    color: "var(--color-primary)"
    background: "var(--color-bg-elevated)"
    padding: medium
`

  };
}
