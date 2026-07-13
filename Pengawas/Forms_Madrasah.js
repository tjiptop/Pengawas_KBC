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
    'form_personil': `    # FORM 1.1. PERSONIL
title: 1.1. Data Personil
group: 1. Data Madrasah
icon: "🧑‍🏫"
description: "Data Kamad, Guru dan Tenaga Pendidik dan Kependidikan yang akan ikut Program KBC"
submission_limit: 0
target_sheet: 1_1_Personil
enable_delegation: false
subordinate_visibility: view
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
    name: madrasah_level
    label: "Jenjang Madrasah"
    default: $madrasah_level
    readonly: true
  - type: text
    name: madrasah_nsm
    label: "NSM"
    default: $madrasah_nsm
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
    label: "Daftar Guru yang akan ikut Program KBC"
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
        type: select
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

    'form_praktek_baik': `    # FORM 1.2. PRAKTEK BAIK MADRASAH
title: 1.2. Praktek Baik Madrasah
group: 1. Data Madrasah
icon: "🌟"
description: "Berbagi cerita, dokumentasi, dan kegiatan praktik baik yang dilakukan oleh madrasah"
submission_limit: 0
target_sheet: 1_2_Praktek_Baik
enable_delegation: true
subordinate_visibility: view
questions:
  - type: note
    label: "Formulir ini digunakan oleh Madrasah untuk berbagi cerita, dokumentasi, dan kegiatan praktik baik implementasi KBC."
    align: left
    margin: none
  - type: spacer
    height: "20px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: madrasah_level
    label: "Jenjang Madrasah"
    default: $madrasah_level
    readonly: true
  - type: text
    name: madrasah_nsm
    label: "NSM"
    default: $madrasah_nsm
    readonly: true
  - type: text
    name: judul
    label: "Judul Kegiatan / Praktik Baik"
    placeholder: "Tuliskan judul yang menarik dan mencerminkan kegiatan..."
    required: true
  - type: date
    name: tanggal
    label: "Tanggal Kegiatan"
    default: $today
    required: true
  - type: multiselect2
    name: tagging
    label: "Kategori / Tagging (Bisa pilih lebih dari satu)"
    placeholder: "Pilih kategori..."
    required: true
    options:
      - "KBC | ⭐ Nilai Spiritual"
      - "KBC | 👤 Personal"
      - "KBC | 💛 Sosial"
      - "KBC | 🌿 Ekologis"
      - "KBC | 🛡️ Kebangsaan"
      - "KBC | 💡 Intelektual"
      - "Area | 📖 Intrakurikuler"
      - "Area | 🏃 Kokurikuler"
      - "Area | 🎨 Ekstrakurikuler"
      - "Area | 🏫 Budaya Madrasah"
      - "Target Level | 🌱 Belum Tumbuh"
      - "Target Level | 🌿 Tumbuh"
      - "Lainnya | 📝 Kegiatan Lainnya"
  - type: textarea
    name: cerita
    label: "Cerita / Deskripsi Kegiatan"
    placeholder: "Ceritakan proses kegiatan, dari latar belakang, pelaksanaan, hingga keunikan kegiatan..."
    rows: 6
    required: true
  - type: text
    name: pengisi
    label: "Nama Pengisi / Kontributor"
    required: true
  - type: multi_file
    name: attach_foto
    label: "Attach / Foto Dokumentasi"
    max_files: 5
    max_size: 10
    accept: "all"
    required: false
  - type: checkbox
    name: sasaran
    label: "Sasaran Penerima Manfaat"
    options:
      - Siswa
      - Guru
      - Kepala Madrasah
      - Orang Tua / Wali Murid
      - Komite Madrasah
      - Masyarakat Sekitar
  - type: textarea
    name: dampak
    label: "Dampak / Catatan Lainnya"
    placeholder: "Tuliskan dampak positif yang dirasakan atau rencana tindak lanjut berikutnya..."
    rows: 4
    required: false
  - type: text
    name: tautan_video
    label: "Tautan Video (YouTube / Google Drive jika ada)"
    placeholder: "https://..."
    required: false
`,

    'form_permasalahan': `    # FORM 1.3. PERMASALAHAN YANG DIHADAPI
title: 1.3. Permasalahan Yang Dihadapi
group: 1. Data Madrasah
icon: "⚠️"
description: "Melaporkan permasalahan atau kendala yang dihadapi madrasah dalam implementasi KBC"
submission_limit: 0
target_sheet: 1_3_Permasalahan
enable_delegation: true
subordinate_visibility: view
questions:
  - type: note
    label: "Formulir ini digunakan oleh Madrasah untuk melaporkan kendala, hambatan, atau permasalahan yang dihadapi terkait program KBC."
    align: left
    margin: none
  - type: spacer
    height: "20px"
    line: false
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true
  - type: text
    name: madrasah_level
    label: "Jenjang Madrasah"
    default: $madrasah_level
    readonly: true
  - type: text
    name: madrasah_nsm
    label: "NSM"
    default: $madrasah_nsm
    readonly: true
  - type: text
    name: judul_masalah
    label: "Judul / Ringkasan Permasalahan"
    placeholder: "Tuliskan ringkasan singkat permasalahan..."
    required: true
  - type: date
    name: tanggal_laporan
    label: "Tanggal Ditemukan / Dilaporkan"
    default: $today
    required: true
  - type: multiselect
    name: kategori
    label: "Kategori Permasalahan"
    placeholder: "Pilih satu atau lebih kategori..."
    required: true
    options:
      - Sumber Daya Manusia (Kamad/Guru/Tendik)
      - Sarana & Prasarana Madrasah
      - Integrasi Kurikulum & Pembelajaran
      - Pemahaman Konsep KBC / Panca Cinta
      - Pendanaan / Dukungan Finansial
      - Komunikasi & Dukungan Orang Tua / Wali
      - Administrasi / Penggunaan Aplikasi MAGIS
      - Faktor Eksternal / Lingkungan
      - Lainnya
  - type: textarea
    name: deskripsi
    label: "Deskripsi Masalah secara Detail"
    placeholder: "Ceritakan kendala secara detail, apa penyebabnya, dan siapa saja yang terdampak..."
    rows: 6
    required: true
  - type: textarea
    name: dampak
    label: "Dampak terhadap Kegiatan Madrasah"
    placeholder: "Bagaimana masalah ini mempengaruhi jalannya pembelajaran KBC atau iklim sekolah..."
    rows: 4
    required: false
  - type: textarea
    name: solusi_sementara
    label: "Langkah Penanganan / Solusi Sementara (Jika Ada)"
    placeholder: "Tuliskan tindakan darurat atau solusi sementara yang sudah dicoba dilakukan..."
    rows: 4
    required: false
  - type: textarea
    name: bantuan_kebutuhan
    label: "Dukungan / Bantuan yang Diharapkan"
    placeholder: "Bantuan apa yang diharapkan dari Pengawas, Kemenag, atau pihak lain untuk menyelesaikan masalah ini..."
    rows: 4
    required: false
  - type: text
    name: pelapor
    label: "Nama Pelapor / Penanggung Jawab"
    required: true
  - type: segmented_control
    name: status_permasalahan
    label: "Status Awal Permasalahan"
    options:
      - Belum Ditangani
      - Sedang Ditangani (Internal)
      - Butuh Bantuan Pengawas
    default: "Belum Ditangani"
    required: true
  - type: multi_file
    name: lampiran
    label: "Lampiran Dokumen / Foto Pendukung"
    max_files: 3
    max_size: 10
    accept: "all"
    required: false
`,

    'form_pendampingan_perencanaan': `    # FORM 2.0. PENDAMPINGAN MADRASAH KBC PILOTING
title: 2.1. Pra Perencanaan 
group: 2. Pendampingan KBC Piloting - PENGAWAS
icon: "🎯"
description: "Sosialisasi dan Mencatat hasil pemetaan awal kondisi madrasah"
submission_limit: 0
target_sheet: 2_1_Pra_Perencanaan
allowed_roles: [district]
subordinate_visibility: view
questions:  
  - type: header
    text: "PRA PENDAMPINGAN"
    level: 1
    align: center
    margin: small
  - type: note
    label: "Formulir ini digunakan oleh Pengawas untuk mencatat progres kegiatan sosialisasi program KBC dan hasil rencana tindak lanjutnya."
    align: left
    margin: none
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
  - type: text
    name: nip_pengawas
    label: "NIP Pengawas"
    default: "$user_username"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Pra Perencanaan Pendampingan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "1. Sosialisasi Program 1 Pengawas 1 Madrasah dampingan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: peserta
    label: "a. Peserta Sosialisasi"
    options:
      - Kepala Madrasah / Wakil Kepala Madrasah
      - Guru
      - Tenaga Pendidik dan Kependidikan
      - Orang Tua Peserta Didik
      - Komite Madrasah
      - Tokoh Masyarakat
      - Lainnya
  - type: text
    name: peserta_lainnya
    label: "Lainnya (Peserta)"
    relevant: "$peserta && $peserta.includes('Lainnya')"
    required: true
  - type: table_col_fix
    name: jumlah_peserta
    label: "b. Jumlah Peserta Sosialisasi"
    first_col_label: Jenis Peserta 
    header_font_bold: false      # Non-bold headers
    header_align: "center"
    items:
      - Kepala Madrasah / Wakil Kepala Madrasah
      - Guru
      - Tenaga Pendidik dan Kependidikan
      - Orang Tua Peserta Didik
      - Komite Madrasah
      - Lainnya
    columns:
      - name: l
        label: "L"
        type: integer
      - name: p
        label: "P"
        type: integer
  - type: checkbox
    name: materi_sosialisasi
    label: "c. Materi Sosialisasi KBC"
    options:
      - Program 1 Pengawas 1 Madrasah Binaan KBC
      - Konsep & Tujuan KBC
      - Penggunaan MAGIS
      - Refleksi Mindset KBC
      - Rencana Tindak Lanjut
      - Lainnya
  - type: text
    name: materi_sosialisasi_lainnya
    label: "Lainnya"
    relevant: "$materi_sosialisasi && $materi_sosialisasi.includes('Lainnya')"
    required: true  
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "2. Melakukan pemetaan kondisi awal madrasah binaan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: area
    label: "a. Area Pemetaan Awal"
    options:
      - Intrakurikuler
      - Kokurikuler
      - Ekstrakurikuler
      - Budaya Madrasah
      - Lainnya
  - type: text
    name: area_lainnya
    label: "Lainnya (Area)"
    relevant: "$area && $area.includes('Lainnya')"
    required: true
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "3. Hasil dari Rencana Tindak Lanjut (RTL)"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: hasil_rtl
    label: "a. Hasil RTL"
    options:
      - SK Tim KBC Madrasah (Draft / Final)
      - Hasil Pemetaan Awal
      - Komitmen Bersama / Deklarasi Madrasah Berbasis Cinta
      - Lainnya
  - type: text
    name: hasil_rtl_lainnya
    label: "Lainnya (Hasil RTL)"
    relevant: "$hasil_rtl && $hasil_rtl.includes('Lainnya')"
    required: true
  - type: textarea
    name: catatan
    label: "b. Catatan tambahan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: kendala
    label: "c. Kendala saat Sosialisasi dan Pemetaan Awal"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "30px"
    line: false
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
    'form_perencanaan_pendampingan': `    # FORM 2.2. RENCANA PENDAMPINGAN
title: 2.2. Perencanaan Pendampingan 
group: 2. Pendampingan KBC Piloting - PENGAWAS
icon: "🎯"
submission_limit: 0
description: "Menentukan Prioritas dan Menyusun Rencana Aksi Implementasi KBC"
target_sheet: 2_2_Refleksi_dan_Penyusunan_Rencana
allowed_roles: [district]
subordinate_visibility: view
questions:  
  - type: header
    text: "PERENCANAAN PENDAMPINGAN"
    level: 1
    align: center
    margin: small
  - type: note
    label: "Formulir ini digunakan oleh Pengawas untuk menentukan prioritas dan menyusun rencana aksi implementasi KBC."
    align: left
    margin: none
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
  - type: text
    name: nip_pengawas
    label: "NIP Pengawas"
    default: "$user_username"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Pra Perencanaan Pendampingan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "1. Area Implementasi KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: area
    label: "a. Prioritas Area Implementasi KBC"
    options:
      - Intrakurikuler
      - Kokurikuler
      - Ekstrakurikuler
      - Budaya Madrasah
      - Lainnya
  - type: text
    name: area_lainnya
    label: "Lainnya (Area)"
    relevant: "$area && $area.includes('Lainnya')"
    required: true
  - type: checkbox
    name: pemetaan_5cinta
    label: "b. Prioritas Nilai Panca Cinta"
    options:
      - Cinta Allah & Rasul
      - Cinta Diri Sendiri & Sesama
      - Cinta Ilmu
      - Cinta Lingkungan
      - Cinta Tanah Air
    required: true
  - type: checkbox
    name: materi_pendampingan
    label: "c. Materi Pendampingan KBC"
    options:
      - Program 1 Pengawas 1 Madrasah Binaan KBC
      - Konsep & Tujuan KBC
      - Penggunaan MAGIS
      - Refleksi Mindset KBC
      - Rencana Tindak Lanjut
      - Lainnya
  - type: text
    name: materi_pendampingan_lainnya
    label: "Lainnya"
    relevant: "$materi_pendampingan && $materi_pendampingan.includes('Lainnya')"
    required: true  
  - type: spacer
    height: "30px"
    line: false 
  - type: header
    text: "2. Melakukan pemetaan kondisi awal madrasah binaan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: area
    label: "a. Area Pemetaan Awal yang telah dilakukan"
    options:
      - Intrakurikuler
      - Kokurikuler
      - Ekstrakurikuler
      - Budaya Madrasah
      - Lainnya
  - type: text
    name: area_lainnya
    label: "Lainnya (Area)"
    relevant: "$area && $area.includes('Lainnya')"
    required: true
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "3. Hasil dari Rencana Tindak Lanjut (RTL)"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: hasil_rtl
    label: "a. Hasil RTL"
    options:
      - SK / Draft Tim KBC
      - Hasil Pemetaan Awal
      - Komitmen Bersama / Deklarasi Madrasah Berbasis Cinta
      - Lainnya
  - type: text
    name: hasil_rtl_lainnya
    label: "Lainnya (Hasil RTL)"
    relevant: "$hasil_rtl && $hasil_rtl.includes('Lainnya')"
    required: true
  - type: textarea
    name: catatan
    label: "b. Catatan tambahan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: kendala
    label: "c. Kendala saat Sosialisasi dan Pemetaan Awal"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "30px"
    line: false
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
    'form_pendampingan_implementasi': `    # FORM 2.3. PENDAMPINGAN IMPLEMENTASI KBC
title: 2.3. Pendampingan Implementasi KBC 
group: 2. Pendampingan KBC Piloting - PENGAWAS
icon: "🎯"
submission_limit: 0
description: "Melakukan Kegiatan Pendampingan Implementasi KBC di Madrasah Binaan"
target_sheet: 2_3_Pendampingan_Implementasi_KBC
allowed_roles: [district]
subordinate_visibility: view
questions:    
  - type: header
    text: "A. Pemantauan Implementasi KBC (Melalui Kunjungan Kelas & Observasi)"
    level: 1
    align: left
    margin: small
  - type: note
    label: "Formulir ini digunakan oleh Pengawas untuk menentukan prioritas dan menyusun rencana aksi implementasi KBC."
    align: left
    margin: none
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
  - type: text
    name: nip_pengawas
    label: "NIP Pengawas"
    default: "$user_username"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Pra Perencanaan Pendampingan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "1. Sosialisasi Program 1 Pengawas 1 Madrasah dampingan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: peserta
    label: "a. Peserta Sosialisasi"
    options:
      - Kepala Madrasah / Wakil Kepala Madrasah
      - Guru
      - Tenaga Pendidik dan Kependidikan
      - Orang Tua Peserta Didik
      - Komite Madrasah
      - Tokoh Masyarakat
      - Lainnya
  - type: text
    name: peserta_lainnya
    label: "Lainnya (Peserta)"
    relevant: "$peserta && $peserta.includes('Lainnya')"
    required: true
  - type: integer
    name: jumlah_peserta
    label: "b. Jumlah Total Peserta Sosialisasi"
    min: 1
    max: 500
    required: true
  - type: checkbox
    name: materi_sosialisasi
    label: "c. Materi Sosialisasi KBC"
    options:
      - Program 1 Pengawas 1 Madrasah Binaan KBC
      - Konsep & Tujuan KBC
      - Penggunaan MAGIS
      - Refleksi Mindset KBC
      - Rencana Tindak Lanjut
      - Lainnya
  - type: text
    name: materi_sosialisasi_lainnya
    label: "Lainnya"
    relevant: "$materi_sosialisasi && $materi_sosialisasi.includes('Lainnya')"
    required: true  
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "2. Melakukan pemetaan kondisi awal madrasah binaan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: area
    label: "a. Area Pemetaan Awal"
    options:
      - Intrakurikuler
      - Kokurikuler
      - Ekstrakurikuler
      - Budaya Madrasah
      - Lainnya
  - type: text
    name: area_lainnya
    label: "Lainnya (Area)"
    relevant: "$area && $area.includes('Lainnya')"
    required: true
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "3. Hasil dari Rencana Tindak Lanjut (RTL)"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: hasil_rtl
    label: "a. Hasil RTL"
    options:
      - SK / Draft Tim KBC
      - Hasil Pemetaan Awal
      - Komitmen Bersama / Deklarasi Madrasah Berbasis Cinta
      - Lainnya
  - type: text
    name: hasil_rtl_lainnya
    label: "Lainnya (Hasil RTL)"
    relevant: "$hasil_rtl && $hasil_rtl.includes('Lainnya')"
    required: true
  - type: textarea
    name: catatan
    label: "b. Catatan tambahan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: kendala
    label: "c. Kendala saat Sosialisasi dan Pemetaan Awal"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "30px"
    line: false
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
    'form_refleksi_pelaporan': `    # FORM 2.4. REFLEKSI AKHIR DAN PELAPORAN PROGRAM KBC
title: 2.4. Refleksi akhir dan Pelaporan Program KBC 
group: 2. Pendampingan KBC Piloting - PENGAWAS
icon: "🎯"
submission_limit: 0
description: "Refleksi akhir dan Pelaporan Program KBC"
target_sheet: 2_4_Refleksi_Pelaporan_KBC
allowed_roles: [district]
subordinate_visibility: view
questions:    
  - type: header
    text: "A. Pemantauan Implementasi KBC (Melalui Kunjungan Kelas & Observasi)"
    level: 1
    align: left
    margin: small
  - type: note
    label: "Formulir ini digunakan oleh Pengawas untuk menentukan prioritas dan menyusun rencana aksi implementasi KBC."
    align: left
    margin: none
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
  - type: text
    name: nip_pengawas
    label: "NIP Pengawas"
    default: "$user_username"
    readonly: true
  - type: date
    name: perencanaan_date
    label: "Tanggal Pra Perencanaan Pendampingan"
    default: "$today"
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "1. Sosialisasi Program 1 Pengawas 1 Madrasah dampingan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: peserta
    label: "a. Peserta Sosialisasi"
    options:
      - Kepala Madrasah / Wakil Kepala Madrasah
      - Guru
      - Tenaga Pendidik dan Kependidikan
      - Orang Tua Peserta Didik
      - Komite Madrasah
      - Tokoh Masyarakat
      - Lainnya
  - type: text
    name: peserta_lainnya
    label: "Lainnya (Peserta)"
    relevant: "$peserta && $peserta.includes('Lainnya')"
    required: true
  - type: integer
    name: jumlah_peserta
    label: "b. Jumlah Total Peserta Sosialisasi"
    min: 1
    max: 500
    required: true
  - type: checkbox
    name: materi_sosialisasi
    label: "c. Materi Sosialisasi KBC"
    options:
      - Program 1 Pengawas 1 Madrasah Binaan KBC
      - Konsep & Tujuan KBC
      - Penggunaan MAGIS
      - Refleksi Mindset KBC
      - Rencana Tindak Lanjut
      - Lainnya
  - type: text
    name: materi_sosialisasi_lainnya
    label: "Lainnya"
    relevant: "$materi_sosialisasi && $materi_sosialisasi.includes('Lainnya')"
    required: true  
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "2. Melakukan pemetaan kondisi awal madrasah binaan KBC"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: area
    label: "a. Area Pemetaan Awal"
    options:
      - Intrakurikuler
      - Kokurikuler
      - Ekstrakurikuler
      - Budaya Madrasah
      - Lainnya
  - type: text
    name: area_lainnya
    label: "Lainnya (Area)"
    relevant: "$area && $area.includes('Lainnya')"
    required: true
  - type: spacer
    height: "30px"
    line: false
  - type: header
    text: "3. Hasil dari Rencana Tindak Lanjut (RTL)"
    level: 2
    align: left
    margin: small
  - type: checkbox
    name: hasil_rtl
    label: "a. Hasil RTL"
    options:
      - SK / Draft Tim KBC
      - Hasil Pemetaan Awal
      - Komitmen Bersama / Deklarasi Madrasah Berbasis Cinta
      - Lainnya
  - type: text
    name: hasil_rtl_lainnya
    label: "Lainnya (Hasil RTL)"
    relevant: "$hasil_rtl && $hasil_rtl.includes('Lainnya')"
    required: true
  - type: textarea
    name: catatan
    label: "b. Catatan tambahan"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: kendala
    label: "c. Kendala saat Sosialisasi dan Pemetaan Awal"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "30px"
    line: false
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
  };
}
