# Panduan Konfigurasi YAML Form: Roles & Visibilitas

Dokumen ini menjelaskan daftar nilai yang diperbolehkan (*allowable options*) beserta perilakunya untuk parameter `allowed_roles` dan `subordinate_visibility` dalam skema YAML form aplikasi Pengawas KBC.

---

## 1. `allowed_roles` (Hak Akses Pengisian Form)

Parameter `allowed_roles` digunakan untuk menentukan siapa saja pengguna (*role*) yang diperbolehkan mengisi atau mengirim (*submit*) suatu formulir.

### Nilai yang Diperbolehkan:
*   **`district`**
    *   **Deskripsi**: Pengawas Madrasah (Kabupaten/Kota).
    *   **Perilaku**: Jika diset, formulir hanya dapat diisi ketika role aktif pengguna adalah `district` (misalnya di portal Pengawas atau saat Pengawas melakukan simulasi "View As" ke madrasah).
*   **`madrasah`** / **`kamad`**
    *   **Deskripsi**: Kepala Madrasah (Kamad) atau Staff Madrasah.
    *   **Perilaku**: Jika diset, formulir dapat diisi oleh pihak madrasah secara langsung atau melalui token delegasi publik/individual.

### Contoh Format Penulisan (Array YAML):
```yaml
# Hanya dapat diisi oleh Pengawas
allowed_roles: [district]

# Hanya dapat diisi oleh Madrasah / Kepala Madrasah
allowed_roles: [madrasah]

# Dapat diisi oleh Pengawas maupun Madrasah
allowed_roles: [district, madrasah]
```

---

## 2. `subordinate_visibility` (Visibilitas untuk Bawahan)

Parameter `subordinate_visibility` menentukan bagaimana formulir ditampilkan pada daftar formulir pihak bawahan (*subordinate* / Madrasah) jika mereka **tidak** memiliki hak akses pengisian (`canFill = false`).

### Nilai yang Diperbolehkan:
*   **`hidden`** (Default jika tidak didefinisikan)
    *   **Perilaku**: Formulir disembunyikan sepenuhnya dari daftar formulir Madrasah apabila Madrasah tidak diperbolehkan mengisinya.
*   **`list`**
    *   **Perilaku**: Formulir tetap muncul di daftar menu/dashboard Madrasah sebagai daftar informasi, tetapi tombol pengisian akan dikunci (*read-only* / dinonaktifkan). Madrasah hanya dapat melihat riwayat pengisian yang dilakukan oleh Pengawas/atasan jika ada.
*   **`view`**
    *   **Perilaku**: Formulir muncul di daftar menu Madrasah dan Madrasah dapat mengklik untuk melihat detail struktur/isi formulir dalam mode pratonton (*preview/read-only*), tetapi tidak dapat melakukan pengiriman (*submit*).

### Contoh Format Penulisan:
```yaml
# Sembunyikan dari daftar madrasah jika tidak boleh diisi
subordinate_visibility: hidden

# Tampilkan hanya di daftar (tombol isi terkunci)
subordinate_visibility: list

# Tampilkan dan izinkan untuk melihat isi form (mode read-only)
subordinate_visibility: view
```

---

## 3. Variabel Template Dinamis (`default` values)

Parameter `default` pada setiap question dapat diisi dengan variabel dinamis (dimulai dengan tanda `$`) untuk mengisi kolom input secara otomatis (*pre-fill*) berdasarkan informasi pengguna yang sedang login atau konteks madrasah yang sedang dinilai.

### Daftar Variabel yang Tersedia:

| Variabel | Sumber Data | Contoh Output | Deskripsi |
| :--- | :--- | :--- | :--- |
| **`$user_fullname`** | Profil Pengguna | `H. Ahmad Fauzi, M.Pd.` | Nama lengkap pengguna yang sedang aktif/login. |
| **`$user_username`** | Profil Pengguna | `197508122000031001` | Username atau NIP pengguna yang aktif. |
| **`$today`** | Sistem (Waktu Lokal) | `2026-07-02` | Tanggal hari ini dalam format `YYYY-MM-DD`. |
| **`$now`** | Sistem (Waktu Lokal) | `2026-07-02T13:45` | Tanggal dan waktu saat ini (`YYYY-MM-DDTHH:MM`). |
| **`$time`** | Sistem (Waktu Lokal) | `13:45` | Waktu saat ini dalam format `HH:MM`. |
| **`$madrasah_name`** | Database Madrasah | `MIN 1 Surabaya` | Nama madrasah dalam penilaian/konteks aktif. |
| **`$madrasah_id`** | Database Madrasah | `111135780001` | ID internal madrasah. |
| **`$madrasah_nsm`** | Database Madrasah | `111135780001` | Nomor Statistik Madrasah (NSM). |
| **`$madrasah_level`** | Database Madrasah | `MI` / `MTs` / `MA` | Jenjang madrasah. |
| **`$madrasah_province`** | Database Madrasah | `JAWA TIMUR` | Provinsi domisili madrasah. |
| **`$madrasah_district`** | Database Madrasah | `KOTA SURABAYA` | Kabupaten/Kota domisili madrasah. |
| **`$madrasah_sub_district`** | Database Madrasah | `GUBENG` | Kecamatan domisili madrasah. |
| **`$madrasah_village`** | Database Madrasah | `AIRLANGGA` | Kelurahan/Desa domisili madrasah. |
| **`$madrasah_village_id`** | Database Madrasah | `3578070001` | Kode/ID Kelurahan/Desa. |
| **`$madrasah_address`** | Database Madrasah | `Jl. Dharmawangsa No. 10` | Alamat fisik lengkap madrasah. |

### Contoh Penggunaan dalam YAML Form:

```yaml
questions:
  - type: text
    name: nama_madrasah
    label: "Nama Madrasah"
    default: $madrasah_name
    readonly: true

  - type: text
    name: lokasi
    label: "Kabupaten & Provinsi"
    default: "$madrasah_district / $madrasah_province"
    readonly: true

  - type: date
    name: tanggal_kunjungan
    label: "Tanggal Pengamatan"
    default: "$today"

  - type: text
    name: nama_petugas
    label: "Nama Pendamping/Pengawas"
    default: $user_fullname
```

---

## 4. Tipe Pertanyaan (*Question Types*)

Setiap item pertanyaan di dalam array `questions` didefinisikan menggunakan parameter `type`. Berikut adalah daftar tipe pertanyaan yang didukung beserta parameter konfigurasinya.

### A. Pilihan Ganda (*Multiselect*) - **TIPE BARU**
Tipe `multiselect` digunakan ketika pengguna diperbolehkan memilih **lebih dari satu opsi** dari daftar yang disediakan. Pilihan yang terpilih akan tampil dalam bentuk badge tag biru dan disimpan sebagai format array teks.

*   **Parameter**:
    *   `type`: `multiselect`
    *   `name`: Nama kolom data (unik).
    *   `label`: Label teks pertanyaan.
    *   `options`: Array opsi yang bisa dipilih.
    *   `placeholder` (Opsional): Teks placeholder saat belum memilih (default: `"Pilih..."`).
    *   `required` (Opsional): `true` / `false`.

*   **Contoh Konfigurasi**:
    ```yaml
    - name: mapel_diampu
      label: "Mata Pelajaran yang Diampu"
      type: multiselect
      options:
        - Guru Kelas
        - PAI (Quran Hadis, Akidah Akhlak, Fiqih, SKI)
        - PPKN
        - Matematika
        - IPA
        - IPS
        - Bahasa Indonesia
        - Bahasa Inggris
      placeholder: "Pilih mata pelajaran..."
      required: true
    ```

---

### B. Daftar Tipe Pertanyaan Lainnya

| Tipe (`type`) | Deskripsi | Parameter Tambahan | Contoh Penggunaan |
| :--- | :--- | :--- | :--- |
| **`text`** / **`email`** / **`password`** / **`tel`** / **`url`** | Input teks satu baris standar. | `placeholder`, `minlength`, `maxlength`, `speech_input: true` (input suara) | `type: text` |
| **`textarea`** | Input teks panjang beberapa baris. | `placeholder`, `rows` (default 4), `speech_input: true` | `type: textarea` |
| **`integer`** / **`float`** | Input angka bulat / pecahan. | `min`, `max`, `step`, `placeholder` | `type: integer` |
| **`date`** / **`time`** / **`datetime`** | Pemilih tanggal, waktu, atau gabungan keduanya. | - | `type: date` |
| **`select`** | Dropdown pilihan tunggal. | `options` (array), `placeholder` | `type: select` |
| **`checkbox`** | Kotak centang tunggal (Yes/No) atau ganda jika ada `options`. | `options` (array), `allow_custom: true`, `custom_label` | `type: checkbox` |
| **`radio`** | Tombol radio pilihan tunggal vertikal. | `options` (array) | `type: radio` |
| **`button_group`** | Pilihan tombol berjejer horizontal. | `options` (array), `button_color`, `button_height` | `type: button_group` |
| **`segmented_control`** | Kontrol pilihan tersegmentasi (segmented pill). | `options` (array), `inline: true/false`, `button_color` | `type: segmented_control` |
| **`likert_scale`** | Skala penilaian Likert horizontal. | `options` (array) | `type: likert_scale` |
| **`star_rating`** | Rating bintang interaktif. | `max_stars` (default 5) | `type: star_rating` |
| **`smiley_rating`** | Rating ekspresi wajah (1-5). | - | `type: smiley_rating` |
| **`image`** | Pengambilan/unggah satu foto. | `button_color`, `button_width` | `type: image` |
| **`multi_image`** | Pengambilan/unggah banyak foto sekaligus. | `max_images` (default 5), `button_color` | `type: multi_image` |
| **`file`** | Unggah satu berkas dokumen (PDF, Docx, dll). | `accept` (misal: `.pdf,.docx`), `button_color` | `type: file` |
| **`multi_file`** | Unggah banyak berkas dokumen sekaligus. | `max_files` (default 5), `accept`, `button_color` | `type: multi_file` |
| **`audio`** | Perekaman/unggah berkas audio. | `button_color` | `type: audio` |
| **`gps`** | Koordinat lokasi (Latitude, Longitude). | - | `type: gps` |
| **`qrcode_scan`** | Scan QR code. | `placeholder` | `type: qrcode_scan` |
| **`qrcode_generator`** | Pembuat gambar QR code dari nilai. | `size` (default 128), `align` | `type: qrcode_generator` |
| **`lookup`** | Dropdown dinamis bersumber data sistem. | `source` (misal: `madrasahs`), `filter` (kondisi JS) | `type: lookup` |
| **`calculate`** | Kolom terhitung otomatis berbasis formula logika (Read-only). | `width` | `type: calculate` |
| **`table`** | Tabel dinamis (baris dapat ditambah dan dihapus dinamis). | `columns` (array objek kolom), `header_font_size`, `header_font_bold: true/false` | `type: table` |
| **`table_col_fix`** | Tabel dinamis dengan baris label statis yang sudah ditentukan. | `columns` (array), `items` (array label baris), `first_col_label` | `type: table_col_fix` |
| **`note`** | Tampilan teks informasi/paragraf statis (bukan input). | `label` (string/array), `align`, `label_size` (small/normal/large), `color`, `weight` | `type: note` |
| **`header`** | Tampilan teks judul/header pemisah bagian form. | `text` / `label`, `level` (default 2), `align`, `style` (bold/italic) | `type: header` |
| **`text_block`** | Blok teks kutipan berlatar belakang. | `content` / `label`, `background`, `padding`, `border_left: true/false` | `type: text_block` |
| **`image_display`** | Menampilkan gambar statis dari URL. | `src`, `alt`, `align`, `width`, `max_width`, `border_radius` | `type: image_display` |
| **`spacer`** | Ruang kosong / garis pembatas horizontal. | `height` (default 20px), `line: true/false` | `type: spacer` |
| **`hidden`** | Bidang tersembunyi di formulir. | - | `type: hidden` |


