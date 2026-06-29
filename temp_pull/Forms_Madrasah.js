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

function getFormDefinitions() {
  return {
    'form_personil': `    # FORM 0.1. PERSONIL
title: 0.1. Data Personil
group: 0. Data Madrasah
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

    'form_observasi': `    # FORM 1.0. OBSERVASI FINAL
title: 1.0. Observasi Akhir Penilaian
group: 1. Observasi
submission_limit: 0
target_sheet: 1_0_Observasi
allowed_roles: [madrasah, fasda]
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
    'form_observasi_kelas': `    # FORM 1.1. OBSERVASI KELAS
title: 1.1. Observasi Ruang Kelas
group: 1. Observasi
submission_limit: 0
target_sheet: 1_1_Observasi_Kelas
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "Ruang kelas"
    level: 3
    align: left
    style: bold
    margin: medium
  - type: multi_image
    name: foto_kondisi_kelas
    label: "Foto"
    max_images: 8
    button_width: "250px"      
  - type: textarea
    name: kelas_catatan
    label: "Catatan kondisi"
    label_size: medium
    rows: 6
  - type: textarea
    name: kelas_pembiasaan
    label: "Catatan kegiatan dan pembiasaan"
    label_size: medium
    rows: 6
`,

    'form_observasi_area_luar': `    # FORM 1.2. OBSERVASI Area luar / halaman / koridor / toilet / kantin
title: 1.2. Observasi Area luar / halaman / koridor / toilet / kantin
group: 1. Observasi
submission_limit: 0
target_sheet: 1_2_Observasi_Area_Luar
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "Area luar / halaman / koridor / toilet / kantin"
    level: 3
    align: left
    style: bold
    margin: medium
  - type: multi_image
    name: foto_kondisi_area_luar
    label: "Foto"
    max_images: 8
    button_width: "250px"      
  - type: textarea
    name: area_luar_catatan
    label: "Catatan kondisi"
    label_size: medium
    rows: 6
  - type: textarea
    name: area_luar_pembiasaan
    label: "Catatan kegiatan dan pembiasaan"
    label_size: medium
    rows: 6
`,

    'form_observasi_ruang_guru': `    # FORM 1.3. OBSERVASI Ruang guru
title: 1.3. Observasi Ruang Guru
group: 1. Observasi
submission_limit: 0
target_sheet: 1_3_Observasi_Ruang_Guru
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "Ruang Guru"
    level: 3
    align: left
    style: bold
    margin: medium
  - type: multi_image
    name: foto_kondisi_ruang_guru
    label: "Foto"
    max_images: 8
    button_width: "250px"      
  - type: textarea
    name: ruang_guru_catatan
    label: "Catatan kondisi"
    label_size: medium
    rows: 6
  - type: textarea
    name: ruang_guru_pembiasaan
    label: "Catatan kegiatan dan pembiasaan"
    label_size: medium
    rows: 6
`,

    'form_observasi_ruang_kamad': `    # FORM 1.4. OBSERVASI ruang kepala madrasah
title: 1.4. Observasi Ruang Kepala Madrasah
group: 1. Observasi
submission_limit: 0
target_sheet: 1_4_Observasi_Ruang_Kamad
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "Ruang Kepala Madrasah"
    level: 3
    align: left
    style: bold
    margin: medium
  - type: multi_image
    name: foto_kondisi_ruang_kamad
    label: "Foto"
    max_images: 8
    button_width: "250px"      
  - type: textarea
    name: ruang_kamad_catatan
    label: "Catatan kondisi"
    label_size: medium
    rows: 6
  - type: textarea
    name: ruang_kamad_pembiasaan
    label: "Catatan kegiatan dan pembiasaan"
    label_size: medium
    rows: 6
`,

    'form_observasi_area_umum': `    # FORM 1.5. OBSERVASI Area umum / kegiatan bersama (opsional)
title: 1.5. Observasi Area umum / kegiatan bersama (opsional)
group: 1. Observasi
submission_limit: 0
target_sheet: 1_5_Observasi_Area_Umum
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "Area umum / kegiatan bersama (opsional)"
    level: 3
    align: left
    style: bold
    margin: medium
  - type: multi_image
    name: foto_kondisi_area_umum
    label: "Foto"
    max_images: 8
    button_width: "250px"      
  - type: textarea
    name: area_umum_catatan
    label: "Catatan kondisi"
    label_size: medium
    rows: 6
  - type: textarea
    name: area_umum_pembiasaan
    label: "Catatan kegiatan dan pembiasaan"
    label_size: medium
    rows: 6
`,
    'instrumen_angket_guru': `    ### 2.1. ANGKET GURU ###
title: 2.1. Instrumen Angket Guru
group: 2. Angket
target_sheet: 2_1_Angket_Guru
enable_delegation: true
allowed_roles: [district]
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
title: 2.2. Instrumen Angket Kepala Madrasah
group: 2. Angket
target_sheet: 2_2_Angket_Kamad
enable_delegation: true
allowed_roles: [district]
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
title: 2.3. Instrumen Angket Orang Tua
group: 2. Angket
target_sheet: 2_2_Angket_Ortu
enable_delegation: true
allowed_roles: [district]
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
`,
    'form_fgd_dewasa': `    # FORM 3.1. FGD GURU, KAMAD DAN ORANGTUA
title: 3.1. Instrumen FGD KBC di Madrasah
group: 3. FGD
submission_limit: 0
target_sheet: 3_1_FGD_Dewasa
allowed_roles: [district]
subordinate_visibility: list
questions:
  - type: header
    text: "A. Pengantar Fasilitator (10 menit)"
    level: 2
    align: left
    margin: small
  - type: note
    label: 
      - "Terima kasih Bapak/Ibu sudah hadir dalam diskusi ini."
      - "Tujuan kita hari ini adalah menggali informasi tentang kondisi saat ini di madrasah."
      - "Tidak ada jawaban benar atau salah."
      - "Ini adalah forum yang aman untuk berpendapat dan berdiskusi kolektif."
    align: left
    margin: none
    indent: 2
  - type: spacer
    height: "10px"
    line: false
  - type: header
    text: "B. Kesepakatan Bersama, Agar diskusi berjalan aman dan nyaman, mari kita sepakati hal-hal berikut:"
    level: 2
    align: left
    margin: small
  - type: note
    label: 
      - "Saling menghargai: tidak menghakimi pendapat orang lain."
      - "Jangan menyebut nama individu atau kelas tertentu."
      - "Ceritakan pengalaman pribadi, bukan menilai orang lain."
      - "Jika ada pertanyaan yang tidak ingin dijawab, Bapak/Ibu boleh melewatkannya."
      - "Kita akan menjaga agar semua mendapat kesempatan bicara."
    align: left
    margin: none
    indent: 2
  - type: spacer
    height: "10px"
    line: false
  - type: header
    text: "1. Mengungkapkan rasa syukur atau terima kasih atas nikmat/kebaikan yang diterima. "
    level: 2
    align: left
    margin: small
  - type: header
    text: "Pertanyaan/Kegiatan pembuka:"
    level: 3
    align: left
    margin: small
  - type: textarea
    name: nikmat_catatan
    label: "Pada sticky notes, tuliskan 1 nikmat atau kebaikan yang Ibu/Bapak dapatkan dalam 2 minggu terakhir."
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Pertanyaan inti: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: nikmat_catatan_2
    label: "Bagaimana madrasah biasanya mengungkapkan/menunjukkan rasa syukur atas kebaikan atau nikmat yang diterima (sesuai nikmat yang diterima yang sudah ditulis di atas atau scr umum)? Di sticky notes juga atau dijawab verbal?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Probing (sesudah melihat sticky notes): "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: nikmat_catatan_3
    label: "Sticky notes yang dianggap menarik diminta utk diceritakan lebih lanjut."
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "10px"
    line: false
  - type: header
    text: "2. Mengajukan pertanyaan kepada orang lain tentang hal-hal yang ingin atau belum ketahui untuk perbaikan diri."
    level: 2
    align: left
    margin: small
  - type: header
    text: "Pertanyaan inti: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: informasi_mencari
    label: "Bagaimana Ibu/Bapak mencari informasi untuk memperbaiki diri, mendukung anak atau madrasah sesuai peran masing-masing?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Probing: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: informasi_bertanya_siapa
    label_size: small
    label: "Kepada siapa Ibu/Bapak biasanya bertanya atau dari mana Ibu/Bapak mendapatkan informasi?"
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: informasi_memanfaatkan
    label_size: small
    label: "Bagaimana Ibu/Bapak memanfaatkan informasi tersebut?"
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: informasi_hambatan_dukungan
    label_size: small
    label: "Apa yang mendukung dan menghambat upaya mencari informasi untuk perbaikan?"
    placeholder: "Tuliskan disini..."
    rows: 4 
  - type: spacer
    height: "10px"
    line: false
  - type: header
    text: "3. Mencegah/menghentikan perundungan/kekerasan yang terjadi pada murid dan orang dewasa di madrasah."
    level: 2
    align: left
    margin: small
  - type: header
    text: "Pertanyaan pembuka: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: perundungan_pengalaman
    label: "Di banyak madrasah, kadang ada tantangan menjaga suasana aman, baik di kelas maupun luar kelas. Bagaimana pengalaman Bapak/Ibu di sini?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Pertanyaan inti: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: perundungan_ciri
    label: "Apa saja ciri perundungan yang Ibu/Bapak ketahui?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: perundungan_followup
    label: "Ketika terjadi perundungan atau kekerasan di madrasah, apa yang biasanya Ibu/bapak lakukan?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: perundungan_sulit_membantu
    label: "Apa yang sudah membantu menjaga rasa aman, dan apa yang masih sulit dilakukan bersama"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Probing: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: perundungan_probing_tindakan
    label_size: small
    label: "Mengapa Ibu/Bapak memilih tindakan tersebut?"
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: spacer
    height: "10px"
    line: false
  - type: header
    text: "Penutup: "
    level: 3
    align: left
    margin: small
  - type: textarea
    name: penutup
    label: "Adakah hal lain yang ingin Ibu/Bapak sampaikan terkait dengan topik-topik yang tadi kita bahas?"
    label_size: small
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "Fasilitator mengapresiasi partisipasi kepala madrasah, guru dan orang tua, dan menutup kegiatan."
    level: 3
    align: left
    margin: small
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

    'instrumen_wawancara_guru': `### 4.1. WAWANCARA GURU ###
title: 4.1. Instrumen Wawancara Mendalam Guru
group: 4. Wawancara Mendalam
target_sheet: 4_1_Wawancara_Guru
allowed_roles: [district]
subordinate_visibility: list
submission_limit: 0
questions:
  - type: header
    text: "A. PETUNJUK PENGISIAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "1. Isi identitas responden di tabel yang tersedia"
    align: left
    margin: none
  - type: note
    label: "2. Tulis jawaban responden selengkap mungkin, sesuai ucapan mereka."
    align: left
    margin: none
  - type: note
    label: "3. Tambahkan catatan observasi non-verbal (misalnya nada suara, dll) di kolom catatan."
    align: left
    margin: none
  - type: note
    label: "4. Tanyakan bila responden berkenan jawabannya direkam. Jika wawancara direkam, tulis 'Direkam' di catatan. Sampaikan bahwa semua yang disampaikan bersifat rahasia."
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
  - type: checkbox
    name: setuju_rekam
    label: "Konfirmasi Persetujuan direkam"
    placeholder: "Saya setuju direkam"
    width: "300px"

  - name: audio_recorder
    label: "Rekaman Audio Wawancara"
    type: audio
    quality: low
    required: false
    max_size: 20  # 20 MB = ~1.5 jam
    button_color: "#8E1F20"
    button_width: "300px"
    relevant: "data.setuju_rekam === true"

  - type: spacer
    height: "50px"
    line: false
    
  - type: header
    text: "C. PERTANYAAN WAWANCARA"
    level: 2
    align: left
    margin: small
  - type: header
    text: "1. Refleksi terhadap hal baik/buruk dalam hidup"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 1_1_
    label: "1.1. Kalau Anda melihat kehidupan Anda secara keseluruhan, apa saja hal yang Anda syukuri, terutama dalam peran Anda sebagai guru? Mengapa hal-hal tersebut penting bagi Anda?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_2_
    label: "1.2. Jika jawaban responden lebih banyak hal baik: Apa saja hal baik yang paling berkesan? Bagaimana pengaruhnya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_3_
    label: "1.3. Bagaimana Bapak/ibu menyikapi/merespon sesuatu hal yang paling berkesan tersebut?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_4_
    label: "1.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "2. Penggunaan informasi untuk perbaikan proses belajar mengajar"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 2_1_
    label: "2.1. Dalam mengajar, Bagaimana Anda biasanya mendapatkan dan menggunakan informasi baru yang membantu Anda dalam tugas sebagai guru? "
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_2_
    label: "2.2. Berdasarkan usaha yang anda lakukan, Bisa ceritakan contoh informasi apa saja yang anda dapatkan dan bagaimana Anda menggunakannya? Apakah ada kendala/tantangan dalam memnfaatkan nya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_3_
    label: "2.3. Apakah usaha yang anda lakukan dirasa sudah/belum memadai untuk membantu anda dalam mengatasi kesulitan/kebingungan atau meningkatkan pengetahuan dan kapasitas anda"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_4_
    label: "2.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "3. Menyadari emosi (perasaan) saat terjadi "
    level: 2
    align: left
    margin: small
  - type: select
    name: 3_1_
    label: "3.1. Ketika Anda sedang merasakan emosi yang kuat (misalnya marah, sedih, atau cemas), apakah Anda biasanya menyadari perasaan itu saat terjadi?"
    label_size: medium
    options:
      - Ya biasanya saat terjadi
      - Tidak, biasanya sesudah terjadi
    required: true
  - type: textarea
    name: 3_2_
    label: "3.2. Jika ya: Apa yang membantu Anda mengenali emosi/perasaan itu saat terjadi? Apakah ada kata atau cara tertentu yang Anda gunakan untuk mengenalinya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    relevant: data.3_1_ === 'Ya biasanya saat terjadi'
  - type: textarea
    name: 3_3_
    label: "3.3. Jika tidak: Apa yang membuat sulit untuk mengenali emosi saat sedang terjadi?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    relevant: data.3_1_ === 'Tidak, biasanya sesudah terjadi'
  - type: textarea
    name: 3_4_
    label: "3.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: header
    text: "4. Mengelola emosi secara positif"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 4_1_
    label: "4.1. Ketika Anda mengalami peristiwa/kejadian/kondisi yang menurut anda cendrung negatif/kurang baik/buruk, emosi atau perasaan apa yang dominan muncul dan dirasakan? Apa yang biasanya anda lakukan saat perasaan/emosi tersebut muncul?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 4_2_
    label: "4.2. Jika jawaban cenderung positif: Apa yang membuat anda dapat merespon peristiwa/kejadian/kondisi yang cendrung negatif/kurang baik/negatif secara positif?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4  

  - type: header
    text: "5. Mengenali dan sikap pada kekerasan (termasuk perundungan)"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 5_1_
    label: "5.1. Menurut Anda apa sajakah yang membuat interaksi/hubungan antar warga madrasah aman dan nyaman?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 5_2_
    label: "5.2. Apakah menurut Anda warga madrasah sudah cukup merasa aman dan nyaman dalam interaksi/hubungan? Ceritakan mengapa!"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 5_3_
    label: "5.3. Apakah menurut anda di madrasah anda terdapat kekerasan dan perundungan? Jika ya sebutkan contoh nya. Jika tidak sebutkan mengapa? (bukan hanya sesama murid tetapi termasuk antara orang dewasa dengan anak, dan sesama orang dewasa)"
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

    'instrumen_wawancara_kamad': `### 4.2. WAWANCARA KEPALA MADRASAH ###
title: 4.2. Instrumen Wawancara Mendalam Kepala Madrasah
group: 4. Wawancara Mendalam
target_sheet: 4_2_Wawancara_Kepala_Madrasah
allowed_roles: [district]
subordinate_visibility: list
submission_limit: 0
questions:
  - type: header
    text: "A. PETUNJUK PENGISIAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "1. Isi identitas responden di tabel yang tersedia"
    align: left
    margin: none
  - type: note
    label: "2. Tulis jawaban responden selengkap mungkin, sesuai ucapan mereka."
    align: left
    margin: none
  - type: note
    label: "3. Tambahkan catatan observasi non-verbal (misalnya nada suara, dll) di kolom catatan."
    align: left
    margin: none
  - type: note
    label: "4. Tanyakan bila responden berkenan jawabannya direkam. Jika wawancara direkam, tulis 'Direkam' di catatan. Sampaikan bahwa semua yang disampaikan bersifat rahasia."
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
  - type: checkbox
    name: setuju_rekam
    label: "Konfirmasi Persetujuan direkam"
    placeholder: "Saya setuju direkam"
    width: "300px"

  - name: audio_recorder
    label: "Rekaman Audio Wawancara"
    type: audio
    quality: low
    required: false
    max_size: 20  # 20 MB = ~1.5 jam
    button_color: "#8E1F20"
    button_width: "300px"
    relevant: "data.setuju_rekam === true"

  - type: spacer
    height: "50px"
    line: false
    
  - type: header
    text: "C. PERTANYAAN WAWANCARA"
    level: 2
    align: left
    margin: small
  - type: header
    text: "1. Refleksi terhadap hal baik/buruk dalam hidup"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 1_1_
    label: "1.1. Kalau Anda melihat kehidupan Anda secara keseluruhan, apa saja hal yang Anda syukuri, terutama dalam peran Anda sebagai Kepala Madrasah? Mengapa hal-hal tersebut penting bagi Anda?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_2_
    label: "1.2. Jika jawaban responden lebih banyak hal baik: Apa saja hal baik yang paling berkesan? Bagaimana pengaruhnya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_3_
    label: "1.3. Bagaimana Bapak/ibu menyikapi/merespon sesuatu hal yang paling berkesan tersebut?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_4_
    label: "1.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "2. Penggunaan informasi untuk perbaikan kepemimpinan"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 2_1_
    label: "2.1.  Dalam menjalankan peran sebagai kepala madrasah, Bagaimana Anda biasanya mendapatkan dan menggunakan informasi baru yang membantu Anda dalam tugas sebagai Kepala Madrasah?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_2_
    label: "2.2. Berdasarkan usaha yang anda lakukan, Bisa ceritakan contoh informasi apa saja yang anda dapatkan dan bagaimana Anda menggunakannya? Apakah ada kendala/tantangan dalam memnfaatkan nya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_3_
    label: "2.3. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_4_
    label: "2.4. Apakah usaha yang anda lakukan dirasa sudah/belum memadai untuk membantu anda dalam mengatasi kesulitan/kebingungan atau meningkatkan pengetahuan dan kapasitas anda"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_5_
    label: "2.5. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "3. Kesadaran emosi saat terjadi "
    level: 2
    align: left
    margin: small
  - type: select
    name: 3_1_
    label: "3.1. Ketika Anda sedang merasakan emosi yang kuat (misalnya marah, sedih, atau cemas), apakah Anda biasanya menyadari perasaan itu saat terjadi?"
    label_size: medium
    options:
      - Ya biasanya saat terjadi
      - Tidak, biasanya sesudah terjadi
    required: true
  - type: textarea
    name: 3_2_
    label: "3.2. Jika ya: Apa yang membantu Anda mengenali emosi itu saat terjadi? Apakah ada kata atau cara tertentu yang Anda gunakan untuk mengenalinya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    relevant: data.3_1_ === 'Ya biasanya saat terjadi'
  - type: textarea
    name: 3_3_
    label: "3.3. Jika tidak: Apa yang membuat sulit untuk mengenali emosi saat sedang terjadi?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
    relevant: data.3_1_ === 'Tidak, biasanya sesudah terjadi'
  - type: textarea
    name: 3_4_
    label: "3.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "4. Mengelola emosi secara positif"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 4_1_
    label: "4.1. Ketika Anda mengalami peristiwa/kejadian/kondisi yang menurut anda cendrung negatif/kurang baik/buruk, emosi atau perasaan apa yang dominan muncul dan dirasakan? Apa yang biasanya anda lakukan saat perasaan/emosi tersebut muncul?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 4_2_
    label: "4.2. Jika jawaban cenderung positif: Apa yang membuat anda dapat merespon peristiwa/kejadian/kondisi yang cendrung negatif/kurang baik/negatif secara positif?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4  
  - type: textarea
    name: 4_3_
    label: "4.3. Jika jawaban cenderung menunjukkan kesulitan mengelola emosi: Apa tantangan terbesar dalam mengelola emosi?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4  
  - type: textarea
    name: 4_4_
    label: "4.4. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "5. Mengenali dan sikap pada kekerasan (termasuk perundungan)"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 5_1_
    label: "5.1. Menurut Anda apa sajakah yang membuat interaksi/hubungan antar warga madrasah aman dan nyaman?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 5_2_
    label: "5.2. Apakah menurut Anda warga madrasah sudah cukup merasa aman dan nyaman dalam interaksi/hubungan? Ceritakan mengapa!"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4  
  - type: textarea
    name: 5_3_
    label: "5.3. Apakah menurut anda di madrasah anda terdapat kekerasan dan perundungan? Jika ya sebutkan contoh nya. Jika tidak sebutkan mengapa? (bukan hanya sesama murid tetapi termasuk antara orang dewasa dengan anak, dan sesama orang dewasa) "
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

    'instrumen_wawancara_ortu': `### 4.2. WAWANCARA ORANG TUA ###
title: 4.3. Instrumen Wawancara Mendalam Orang Tua
group: 4. Wawancara Mendalam
target_sheet: 4_3_Wawancara_Orang_Tua
allowed_roles: [district]
subordinate_visibility: list
submission_limit: 0
questions:
  - type: header
    text: "A. PETUNJUK PENGISIAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "1. Isi identitas responden di tabel yang tersedia"
    align: left
    margin: none
  - type: note
    label: "2. Tulis jawaban responden selengkap mungkin, sesuai ucapan mereka."
    align: left
    margin: none
  - type: note
    label: "3. Tambahkan catatan observasi non-verbal (misalnya nada suara, dll) di kolom catatan."
    align: left
    margin: none
  - type: note
    label: "4. Tanyakan bila responden berkenan jawabannya direkam. Jika wawancara direkam, tulis 'Direkam' di catatan. Sampaikan bahwa semua yang disampaikan bersifat rahasia."
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
  - type: checkbox
    name: setuju_rekam
    label: "Konfirmasi Persetujuan direkam"
    placeholder: "Saya setuju direkam"
    width: "300px"
    
  - name: audio_recorder
    label: "Rekaman Audio Wawancara"
    type: audio
    quality: low
    required: false
    max_size: 20  # 20 MB = ~1.5 jam
    button_color: "#8E1F20"
    button_width: "300px"
    relevant: "data.setuju_rekam === true"

  - type: spacer
    height: "50px"
    line: false
    
  - type: header
    text: "C. PERTANYAAN WAWANCARA"
    level: 2
    align: left
    margin: small
  - type: header
    text: "1. Hal Baik dan Hal Sulit"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 1_1_
    label: "1.1. Kalau Anda melihat kehidupan Anda secara keseluruhan, apa saja hal yang Anda syukuri, terutama dalam peran Anda sebagai Orang tua? Mengapa hal-hal tersebut penting bagi Anda?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_2_
    label: "1.2. Jika jawaban responden lebih banyak hal baik: Apa saja hal baik yang paling berkesan? Bagaimana pengaruhnya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_3_
    label: "1.3. Bagaimana Bapak/ibu menyikapi/merespon sesuatu hal yang paling berkesan tersebut?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_4_
    label: "1.4. Probing tentang anak: Apakah Bapak/Ibu juga mengajak atau mendorong anak untuk melihat hal-hal baik dalam hidup? Bagaimana caranya?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 1_5_
    label: "1.5. Catatan Pewawancara."
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4

  - type: header
    text: "2. Bertanya untuk Perbaikan Diri"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: 2_1_
    label: "2.1. Apa sajakah hal yang selama ini anda lakukan untuk menambah informasi, meningkatkan pengetahuan, ataupun mencari solusi dari persoalan yang ibu/bapak hadapi khususnya pada aspek pengasuhan atau mendukung anak belajar"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_2_
    label: "2.2. Jika ya: Apakah hal tersebut dirasa sudah memadai/ cukup membantu dalam mengatasi persoalan yang dihadapi? Ceritakan mengapa"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_3_
    label: "2.3. Probing tentang anak: Apakah anak anda suka bertanya atau membaca? jika iya apa yang biasanya mereka tanyakan atau baca?"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_4_
    label: "2.4. Jika iya, Apakah ada tantangan dalam menjawab pertanyaan atau menjelaskan sesuatu yang anak anda tanyakan? Ceritakan!"
    label_size: medium
    placeholder: "Tuliskan disini..."
    rows: 4
  - type: textarea
    name: 2_5_
    label: "2.5. Catatan Pewawancara."
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


  };
}


