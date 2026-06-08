
const FormsPengawas = {

  'evaluasi_diri_pengawas': `
title: "II. RENCANA PERBAIKAN"
description: "Instrumen Rencana Perbaikan Pembelajaran Guru"
icon: "📝"
group: "Guru"
target_sheet: "Guru_Rencana"
requires_madrasah: false
questions:
  - type: header
    text: "A. RENCANA PERBAIKAN PEMBELAJARAN"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Berdasarkan refleksi Anda di atas, isikan 1 rencana untuk setiap pertanyaan di bawah ini sesuai dengan kebutuhan dan kemampuan."
    align: left
    margin: none
  - type: textarea
    name: no01
    label: "1. Apa yang Anda akan lakukan agar peserta didik mampu menerapkan dan merefleksikan materi yang dipelajari dengan situasi kehidupan nyata?"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no02
    label: "2. Apa yang Anda akan lakukan agar peserta didik terlibat secara interaktif dan menunjukkan kecintaan terhadap pembelajaran?"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no03
    label: "3. Apa yang Anda akan lakukan agar peserta didik terbiasa mengutarakan pendapat dan pertanyaan, serta menyampaikan kritik dengan cara yang membangun?"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no04
    label: "4. Apa yang Anda akan lakukan agar peserti didik mampu mengelola emosinya, berempati pada orang lain, membangun relasi positig dan mampu mengembangkan potensi masing-masing?. "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no05
    label: "5. Apa yang Anda akan lakukan agar pembelajaran di kelas sangat fokus, perilaku peserta didik sangat mendukung suasana kelas menjadi optimal.  "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no06
    label: "6. Apa yang Anda akan lakukan agar peserta didik menunjukkan antusiasme tinggi dan percaya diri dalam menghadapi tantangan baru? "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no07
    label: "7. Apa yang Anda akan lakukan agar semua murid aktif menjaga kebersihan dan kelestarian lingkungan di kelas, seperti: mengurangi sampah plastik sekali pakai dan menggunakan bahan bekas secara kreatif? "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: header
    text: "B. RENCANA PENINGKATAN KOMPETENSI"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Untuk mendukung perbaikan yang Anda rencanakan di atas, isikan kompetensi yang Anda perlu tingkatkan."
    align: left
    margin: none
  - type: textarea
    name: no01
    label: "1. Apa kompetensi kepribadian yang paling Anda ingin tingkatkan?"
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no02
    label: "2. Apa kompetensi sosial yang paling Anda ingin tingkatkan? "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no03
    label: "3. Apa kompetensi pedagogis yang paling Anda ingin tingkatkan? "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
  - type: textarea
    name: no04
    label: "4. Apa kompetensi profesional yang paling Anda ingin tingkatkan?  "
    label_size: medium
    placeholder: "Uraikan disini..."
    rows: 5
    required: true
`,
  // ==========================================================
  // FORM 2: LAPORAN BULANAN PENGAWAS
  // ==========================================================
  // FORM 2: RENCANA KERJA MADRASAH (PBD)
  // ==========================================================
  'rencana_kerja_madrasah': `
title: "II. RENCANA KERJA MADRASAH (PBD)"
description: "Penyusunan Rencana Kerja Madrasah terkait perencanaan berbasis data (PBD)"
icon: "🏫"
group: "Kepala Madrasah"
target_sheet: "Kamad_Rencana"
requires_madrasah: false
questions:
  - type: header
    text: "A. RENCANA KERJA MADRASAH"
    level: 2
    align: left
    margin: small
  - type: note
    label: "Terkait dengan perencanaan berbasis data (PBD) yang mencantumkan kegiatan seperti proses identifikasi, refleksi dan perbaikan berkelanjutan, anda dapat membuat rencana pada masing masing pernyataan di bawah ini dengan minimal 1 rencana aksi yang akan dilakukan pada madrasah."
    align: left
    margin: none
  - type: textarea
    name: no01
    label: "1. Apa rencana madrasah untuk mengidentifikasi tantangan pembelajaran dan melakukan perbaikan secara konsisten?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no02
    label: "2. Apa rencana madrasah untuk program refleksi, supervisi, dan peningkatan kompetensi guru?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no03
    label: "3. Apa rencana madrasah untuk keterbukaan informasi dan keterlibatan seluruh warga dalam perencanaan?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no04
    label: "4. Apa rencana madrasah untuk menciptakan lingkungan yang aman dan nyaman dengan prosedur yang dijalankan dengan komitmen tinggi oleh warga madrasah?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no05
    label: "5. Apa rencana madrasah untuk kebijakan inklusif yang mengakomodasi kebutuhan belajar dengan melibatkan semua warga madrasah?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no06
    label: "6. Apa rencana madrasah untuk menciptakan lingkungan madrasah yang lestari, bersih, dan rapi?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
  - type: textarea
    name: no07
    label: "7. Apa rencana madrasah untuk menerapkan budaya positif?"
    label_size: medium
    placeholder: "Uraikan rencana aksi disini..."
    rows: 5
    required: true
`,
  // ==========================================================
  // FORM 3: RENCANA PENDAMPINGAN PENGAWAS
  // ==========================================================
  'rencana_pendampingan_pengawas': `
title: "III. RENCANA PENDAMPINGAN PENGAWAS"
description: "Rencana Kebutuhan Pendampingan dan Target Perubahan"
icon: "🧑‍🏫"
group: "Pengawas"
target_sheet: "Pengawas_Pendampingan"
requires_madrasah: false
questions:
  - type: header
    text: "A. IDENTIFIKASI & TARGET PENDAMPINGAN"
    level: 2
    align: left
    margin: small
  - type: textarea
    name: langkah3
    label: "Langkah 3: Jelaskan deskripsi kebutuhan pendampingan:"
    label_size: medium
    placeholder: "Uraikan deskripsi kebutuhan pendampingan disini..."
    description: "Utama kebutuhan terkait dua hal: 1. Lingkungan belajar (keamanan lingkungan madrasah, inklusivitas, madrasah ramah anak, kelestarian lingkungan madrasah, penerapan disiplin positif) 2. Kepemimpinan perubahan (perbaikan pembelajaran, peningkatan kompetensi, dan pengelolaan program madrasah serta keterlibatan warga madrasah)"
    rows: 6
    required: true
  - type: textarea
    name: langkah4
    label: "Langkah 4: Apa target perubahan setelah pendampingan?"
    label_size: medium
    placeholder: "Uraikan target perubahan disini..."
    description: "Perubahan utama: 1. Mindset atau paradigma berbasis KBC 2. penerapan lingkungan ramah anak, ramah lingkungan, dan anak sejahtera secara mental dan spiritual"
    rows: 6
    required: true
`

};

function getPengawasForms() {
  return FormsPengawas;
}
