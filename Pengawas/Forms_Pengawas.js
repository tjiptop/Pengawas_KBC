const FormsPengawas = {

  'kesiapan_kbc_pengawas': `
group: "Program KBC Pengawas"
icon: "🧑‍🏫"
title: "1. Kesiapan Pengawas"
description: "Instrumen Evaluasi Kesiapan & Kebutuhan Pengawas Madrasah (Program KBC)"
target_sheet: "Pengawas_Kesiapan_KBC"
questions:
  - type: header
    text: "A. Aspek Pemahaman Konsep dan Kesiapan Dasar"
    level: 3
    align: left
    margin: small
  - type: radio
    name: pemahaman_kesiapan
    label: '1. Kurikulum Berbasis Cinta (KBC) tidak menggantikan kurikulum nasional, melainkan menguatkannya melalui penanaman nilai Panca Cinta (Cinta Allah & Rasul, Cinta Ilmu, Cinta Lingkungan, Cinta Diri & Sesama, Cinta Tanah Air). Sejauh mana kesiapan Bapak/Ibu dalam mendampingi madrasah mengintegrasikan nilai-nilai ini?'
    required: true
    options:
      - 'Sangat Siap: Saya sudah memahami konsep Panca Cinta secara utuh dan siap mendampingi pengintegrasiannya di madrasah.'
      - 'Siap dengan Catatan: Saya paham teorinya, namun butuh contoh konkret penerapan Panca Cinta di madrasah binaan.'
      - 'Kurang Siap: Saya baru mengetahui sekilas dan membutuhkan Bimbingan Teknis (Bimtek) pendalaman materi KBC.'
      - 'Belum Siap: Saya belum memahami konsep KBC dan cara kerjanya sama sekali.'
  - type: checkbox
    name: tantangan_area
    label: '2. Implementasi KBC di madrasah harus meresap menjadi jiwa dalam 4 area utama. Menurut pemetaan awal Bapak/Ibu, area mana saja yang diprediksi akan menjadi tantangan terberat bagi madrasah binaan Bapak/Ibu sehingga membutuhkan fokus pendampingan ekstra?'
    required: true
    options:
      - 'Intrakurikuler: Mengintegrasikan nilai KBC secara mendalam dalam RPP dan proses belajar di kelas.'
      - 'Kokurikuler: Melaksanakan proyek lintas mata pelajaran yang bermuatan karakter KBC.'
      - 'Ekstrakurikuler: Mengoptimalkan kegiatan ekskul (pramuka, kesenian, dll) untuk menumbuhkan cinta.'
      - 'Budaya Madrasah: Membangun kebijakan ramah anak, anti-bullying, dan pembiasaan lingkungan lestari yang konsisten.'

  - type: header
    text: "B. Aspek Peran dan Keterampilan Pendampingan"
    level: 3
    align: left
    margin: small
  - type: checkbox
    name: upgrading_kompetensi
    label: '3. Buku Saku mensyaratkan pergeseran peran pengawas menjadi 5 fungsi: Coach, Mentor, Trainer, Konsultan, dan Konselor. Peran mana saja yang Bapak/Ibu rasa paling membutuhkan upgrading kompetensi/pelatihan lebih lanjut?'
    required: true
    options:
      - 'Coach: Keterampilan menggali potensi guru dan kepala madrasah melalui pertanyaan tanpa mendikte.'
      - 'Mentor: Keterampilan memberi arahan dan berbagi praktik baik implementasi KBC.'
      - 'Trainer: Keterampilan memfasilitasi pelatihan KBC langsung bagi guru di madrasah binaan.'
      - 'Konsultan: Keterampilan merumuskan solusi atas kendala spesifik manajerial di madrasah.'
      - 'Konselor: Keterampilan memberi dukungan psikologis, motivasi, dan Social Emotional Skill bagi GTK.'
  - type: radio
    name: kemahiran_grow
    label: '4. Dalam menjalankan peran sebagai Coach, pengawas disarankan menggunakan alur GROW (Goal, Reality, Option, Will) dan "Mendengar Aktif". Bagaimana tingkat kemahiran Bapak/Ibu saat ini terkait teknik tersebut?'
    required: true
    options:
      - 'Mahir: Saya rutin menggunakan alur GROW dan dapat menahan diri untuk tidak langsung memberi solusi/nasihat.'
      - 'Berkembang: Saya tahu teorinya, namun saat praktik masih sering terjebak memberikan instruksi (directing) dibanding menggali opsi dari guru.'
      - 'Pemula: Saya sering mendengar istilahnya, tapi belum tahu cara mempraktikkan pertanyaan berbobot sesuai alur GROW.'
      - 'Belum Tahu: Saya belum mengenal alur GROW dalam coaching.'

  - type: header
    text: "C. Aspek Penggunaan Ekosistem Digital (MAGIS)"
    level: 3
    align: left
    margin: small
  - type: radio
    name: kesiapan_magis
    label: '5. Kemenag menggunakan platform digital Madrasah Digital Supervision (MAGIS) untuk mencatat refleksi dan laporan coaching clinic secara real-time. Apa status kesiapan Bapak/Ibu dalam pemanfaatan aplikasi ini?'
    required: true
    options:
      - 'Sudah mengunduh, memiliki akun, dan sudah lancar menggunakan fitur refleksi serta laporan pendampingan.'
      - 'Sudah memiliki akun, tetapi masih bingung/mengalami kendala dalam mengisi instrumen refleksi dan menyusun laporan.'
      - 'Belum memiliki akun karena kendala teknis (jaringan/perangkat), namun siap belajar.'
      - 'Belum mengunduh dan sangat membutuhkan panduan teknis/tutorial dari awal.'

  - type: header
    text: "D. Aspek Siklus Langkah Pendampingan"
    level: 3
    align: left
    margin: small
  - type: checkbox
    name: bimbingan_langkah
    label: '6. Siklus kerja pendampingan pengawas KBC terdiri dari 4 langkah: 1) Perencanaan, 2) Refleksi & Penyusunan Rencana, 3) Implementasi/Pemantauan, dan 4) Pelaporan. Berdasarkan pengalaman Bapak/Ibu, tahap mana yang paling memerlukan bimbingan dan penyediaan instrumen pendukung tambahan?'
    required: true
    options:
      - 'Langkah 1 (Perencanaan): Kesulitan menyusun timeline dan observasi dasar kondisi madrasah.'
      - 'Langkah 2 (Refleksi): Kesulitan memandu Kepala Madrasah/Guru melakukan refleksi mindset KBC dan mengisi aplikasi MAGIS.'
      - 'Langkah 3 (Pelaksanaan): Kendala logistik/waktu untuk melakukan kunjungan pemantauan minimal 1x sebulan ke madrasah binaan.'
      - 'Langkah 4 (Pelaporan): Kesulitan dalam menyusun analisis perubahan perilaku (sebelum & sesudah) untuk diinput ke menu coaching clinic MAGIS.'

  - type: header
    text: "E. Aspek Kebutuhan Dukungan/Fasilitasi"
    level: 3
    align: left
    margin: small
  - type: checkbox
    name: bentuk_intervensi
    label: '7. Untuk memastikan program "1 Pengawas 1 Madrasah Binaan KBC" ini berjalan efektif, bentuk intervensi atau fasilitas apa yang paling Bapak/Ibu harapkan segera dipenuhi oleh Direktorat GTK/Kanwil?'
    required: true
    options:
      - 'Pendistribusian Modul dan Buku Saku Pendampingan KBC secara cetak/digital.'
      - 'Bimbingan Teknis (Bimtek) khusus simulasi Coaching GROW dan cara "Mendengar Aktif".'
      - 'Bimbingan Teknis (Bimtek) operasionalisasi platform MAGIS bagi pengawas and kepala madrasah.'
      - 'Forum sharing session rutin (Kelompok Kerja Pengawas) untuk membahas studi kasus dan best practice implementasi KBC.'
      - 'Ketersediaan instrumen pemantauan (Rubrik Pertumbuhan Karakter) yang baku dan mudah digunakan di lapangan.'
`,

  'mindset_kbc_pengawas': `
title: "2. Instrumen Mindset KBC"
description: "Instrumen Evaluasi Mindset Kurikulum Berbasis Cinta (KBC) Pengawas"
icon: "🧠"
group: "Program KBC Pengawas"
target_sheet: "Pengawas_Mindset_KBC"
requires_madrasah: false
questions:
  - type: header
    text: "Instruksi Pengisian: Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda."
    level: 3
    align: left
    margin: small
  - type: header
    text: "A. Cinta Allah dan Rasul-Nya"
    level: 3
    align: left
    margin: small
  - type: radio
    name: mindset_q1
    label: "1. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Rasa takut akan siksaan Allah menuntun seseorang untuk hidup lebih taat dan bertanggung jawab."
      - "Saya yakin kesalahan yang diperbuat manusia adalah sarana untuk memperbaiki diri dan lebih mendekatkan diri kepada-Nya"
  - type: radio
    name: mindset_q2
    label: "2. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Mengajarkan tentang dosa-dosa akibat meninggalkan ibadah wajib menjadi cara tepat untuk mendidik murid agar rajin ibadah"
      - "Mengajarkan keutamaan akhlak Rasulullah menjadi cara tepat mendidik murid agar taat pada ajaran Islam"
  - type: radio
    name: mindset_q3
    label: "3. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Memberikan hadiah pada murid yang tertib atau hukuman pada murid yang melanggar aturan, adalah cara ampuh mendisiplinkan murid."
      - "Saya mendidik murid untuk taat karena didorong rasa cinta/kerinduan kepada Allah, bukan karena mengharap imbalan."

  - type: header
    text: "B. Cinta Ilmu"
    level: 3
    align: left
    margin: small
  - type: radio
    name: mindset_q4
    label: "4. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Keberhasilan saya sebagai pendidik adalah ketika murid mampu menyelesaikan soal-soal ujian dengan sempurna"
      - "Keberhasilan pembelajaran adalah ketika murid dapat memanfaatkan ilmunya untuk menyelesaikan permasalahan sehari-hari"
  - type: radio
    name: mindset_q5
    label: "5. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Proses diskusi dan analisa teks kitab suci adalah cara utama untuk memperoleh pemahaman yang benar dan utuh tentang agama"
      - "Pemahaman agama yang mendalam dan berkesadaran seringkali didapat melalui pengalaman batin, refleksi dan intuisi (cahaya hati), melengkapi teks."
  - type: radio
    name: mindset_q6
    label: "6. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Pembelajaran di kelas yang fokus pada konsep materi yang terstruktur adalah cara terbaik untuk menguasai ilmu."
      - "Memperbanyak pengalaman pembelajaran di dunia nyata membuat pemahaman konsep murid lebih mendalam"
  - type: radio
    name: mindset_q7
    label: "7. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Menghafal dan menyanyikan nama-nama Allah (Asmaul husna) merupakan cara tepat dalam pembelajaran asmaul husna"
      - "Membedakan, mengidentifikasi, dan menemukan karakteristik ciptaan Allah dan buatan manusia dapat meningkatkan pemahaman dan keimanan pada asma Allah Maha Pencipta"
  - type: radio
    name: mindset_q8
    label: "8. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya percaya kecerdasan dan prestasi akademik adalah penentu utama keberhasilan murid dalam kehidupannya."
      - "Saya percaya pendidikan karakter menjadi penentu utama keberhasilan murid dalam kehidupannya"

  - type: header
    text: "C. Cinta Alam"
    level: 3
    align: left
    margin: small
  - type: radio
    name: mindset_q9
    label: "9. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Menurut saya makanan dan minuman kemasan itu praktis"
      - "Saya lebih senang membawa tempat makan dan minum sendiri"
  - type: radio
    name: mindset_q10
    label: "10. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Alam dan seluruh isinya diciptakan Allah SWT hanya untuk memenuhi kebutuhan manusia"
      - "Menjaga kebersihan dan menjaga kelestarian alam adalah bagian dari ibadah"
  - type: radio
    name: mindset_q11
    label: "11. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Semua ciptaan Allah termasuk benda mati sejatinya adalah bertasbih kepada Allah SWT"
      - "Tanah, air, gunung dan benda mati lainnya tidak bertasbih kepada Allah SWT"

  - type: header
    text: "D. Cinta Diri Sendiri dan Sesama Manusia"
    level: 3
    align: left
    margin: small
  - type: radio
    name: mindset_q12
    label: "12. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya seringkali merasa tidak mampu melakukan pekerjaan sebaik orang lain"
      - "Saya tidak takut gagal, karena saya yakin ada pelajaran dari kegagalan"
  - type: radio
    name: mindset_q13
    label: "13. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya cenderung akan bereaksi jika melihat tindakan yang tidak benar"
      - "Saya berusaha mencari tahu alasan dari suatu tindakan/kejadian"
  - type: radio
    name: mindset_q14
    label: "14. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Salah satu tanda kedisiplinan murid adalah patuh pada aturan"
      - "Salah satu tanda kedisiplinan adalah murid memahami konsekuensi dari tindakannya"
  - type: radio
    name: mindset_q15
    label: "15. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Tugas guru adalah memastikan ketercapaian tujuan belajar murid pada hal tertentu"
      - "Tugas guru adalah mendukung pencapaian murid sesuai dengan potensinya"
  - type: radio
    name: mindset_q16
    label: "16. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya percaya kebiasaan akan membangun karakter"
      - "Saya percaya kesadaran akan membangun karakter"
  - type: radio
    name: mindset_q17
    label: "17. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Jika murid membuat kesalahan saya akan menegur dan menunjukkan letak kesalahannya"
      - "Jika murid membuat kesalahan, saya akan menanyakan mengapa melakukan kesalahan"
  - type: radio
    name: mindset_q18
    label: "18. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya akan senang jika murid selalu mengikuti arahan guru"
      - "Saya senang jika murid berani menyampaikan pendapatnya meskipun berbeda dengan guru"
  - type: radio
    name: mindset_q19
    label: "19. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Hukuman/sanksi yang berat adalah cara tepat memberi efek jera dan mendisiplinkan murid"
      - "Mengajak murid memperbaiki kesalahan yang dibuatnya adalah cara efektif untuk menumbuhkan tanggung jawab."
  - type: radio
    name: mindset_q20
    label: "20. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saling mengejek sesama murid adalah hal biasa yang dapat menguatkan mental murid"
      - "Setiap orang berharga dan tidak layak dipermalukan dengan alasan bercanda"
  - type: radio
    name: mindset_q21
    label: "21. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya cenderung diam jika melihat ketidakadilan karena tidak mau ikut campur urusan orang lain"
      - "Saya berupaya mengatasi ketidakadilan dan mengajak orang lain melakukan hal yang sama"
  - type: radio
    name: mindset_q22
    label: "22. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya cenderung membuat klasifikasi murid berdasarkan kemampuan"
      - "Saya cenderung mencari tahu jika ada murid yang berperilaku berbeda"
  - type: radio
    name: mindset_q23
    label: "23. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Sebagai guru saya cenderung membiarkan murid memilih kelompoknya"
      - "Sebagai guru saya cenderung membagi kelompok secara acak atau merotasi posisi duduk murid"

  - type: header
    text: "E. Cinta Tanah Air"
    level: 3
    align: left
    margin: small
  - type: radio
    name: mindset_q24
    label: "24. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Dalam hal memilih pemimpin, saya akan memprioritaskan pada yang berasal dari daerah/ kelompok saya"
      - "Dalam memilih pemimpin, yang terpenting adalah kemampuan dan integritasnya, dari manapun asalnya"
  - type: radio
    name: mindset_q25
    label: "25. Pilihlah salah satu pernyataan yang paling sesuai dengan diri Anda !"
    required: true
    options:
      - "Saya menilai ajaran agama dapat mengakomodir budaya lokal tanpa melanggar ajaran agama"
      - "Saya menilai banyak tradisi dan budaya lokal yang cenderung tidak sesuai dengan ajaran agama saya"
`

};

function getPengawasForms() {
  return FormsPengawas;
}
