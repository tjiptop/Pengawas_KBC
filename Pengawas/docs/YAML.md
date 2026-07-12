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

