# 📋 Panduan Perintah `npm run` — Project Pengawas KBC

Semua perintah di bawah ini dijalankan dari **folder utama project** (`d:\AIDEV\Pengawas_KBC`)
melalui terminal (PowerShell / Command Prompt).

---

## 🗂️ Kelompok Perintah

### 1. Perintah Utama (Staging & Production)

---

#### `npm run watch:staging`
```
Kegunaan : Mode LIVE WATCH untuk pengembangan di Staging
Kapan    : Saat sedang aktif mengedit dan ingin langsung melihat perubahan
Cara     : Jalankan sekali, biarkan berjalan di terminal
```
**Yang terjadi:**
1. Menyalin konfigurasi Staging ke `.clasp.json`
2. Memantau setiap perubahan file secara otomatis
3. Setiap Anda tekan **Ctrl + S** (save), kode langsung ter-upload ke GAS Staging
4. Untuk melihat hasil → buka URL `/dev` Staging di browser → tekan **F5**

> ⚠️ Jangan tutup terminal selama masih ingin live watch. Hentikan dengan **Ctrl + C**.

---

#### `npm run release:staging`
```
Kegunaan : Upload kode + buat versi deployment BARU di Staging
Kapan    : Setelah selesai testing di /dev dan ingin update URL /exec Staging
Cara     : Jalankan sekali, selesai otomatis
```
**Yang terjadi:**
1. Menyalin konfigurasi Staging ke `.clasp.json`
2. Push semua file kode ke GAS Staging
3. Membuat **deployment versi baru** → URL `/exec` Staging langsung terupdate

---

#### `npm run deploy:staging`
```
Kegunaan : Hanya PUSH kode ke Staging (tanpa buat versi deployment baru)
Kapan    : Kalau hanya ingin sync kode tanpa update URL /exec
Cara     : Jalankan sekali, selesai otomatis
```
**Yang terjadi:**
1. Menyalin konfigurasi Staging ke `.clasp.json`
2. Push semua file kode ke GAS Staging
3. URL `/exec` TIDAK berubah (perubahan hanya terlihat di `/dev`)

---

#### `npm run deploy:prod`
```
Kegunaan : Push kode ke Production (HATI-HATI!)
Kapan    : Setelah yakin kode di staging sudah benar dan siap rilis ke pengguna
Cara     : Jalankan sekali, selesai otomatis
```
**Yang terjadi:**
1. Menyalin konfigurasi Production ke `.clasp.json`
2. Push semua file kode ke GAS Production

> ⛔ **PERHATIAN**: Ini akan mengubah kode yang dipakai pengguna nyata. Pastikan sudah ditest di Staging terlebih dahulu!

---

### 2. Perintah Madrasah (App Madrasah terpisah)

---

#### `npm run clasp:madrasah:watch`
```
Kegunaan : Live watch untuk project Madrasah (bukan Pengawas)
```

#### `npm run clasp:madrasah:push`
```
Kegunaan : Push sekali ke project Madrasah
```

#### `npm run clasp:madrasah:pull`
```
Kegunaan : Ambil (unduh) kode terbaru dari GAS project Madrasah ke lokal
Kapan    : Jika ada perubahan di GAS editor online yang belum ada di file lokal
```

#### `npm run clasp:madrasah:status`
```
Kegunaan : Cek file mana saja yang berbeda antara lokal dan GAS Madrasah
```

---

### 3. Perintah Pengawas (Push Langsung tanpa switching Staging/Prod)

---

#### `npm run clasp:pengawas:watch`
```
Kegunaan : Live watch langsung ke project yang ditunjuk .clasp.json aktif
Kapan    : Jarang digunakan, lebih baik pakai watch:staging
```

#### `npm run clasp:pengawas:push`
```
Kegunaan : Push sekali langsung ke project yang ditunjuk .clasp.json aktif
```

#### `npm run clasp:pengawas:pull`
```
Kegunaan : Ambil kode terbaru dari GAS Pengawas ke lokal
Kapan    : Jika ada perubahan di GAS editor online yang belum ada di file lokal
```

#### `npm run clasp:pengawas:status`
```
Kegunaan : Cek file mana yang berbeda antara lokal dan GAS Pengawas
```

---

## 🔄 Alur Kerja yang Disarankan

```
┌─────────────────────────────────────────────────────┐
│                  ALUR PENGEMBANGAN                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Edit kode di VS Code / editor                   │
│                                                     │
│  2. npm run watch:staging                           │
│     (jalankan sekali, biarkan aktif)                │
│                                                     │
│  3. Simpan file (Ctrl + S)                          │
│     → otomatis ter-upload ke Staging                │
│                                                     │
│  4. Buka URL /dev Staging di browser                │
│     → tekan F5 untuk lihat perubahan                │
│                                                     │
│  5. Jika sudah OK dan ingin update /exec:           │
│     npm run release:staging                         │
│                                                     │
│  6. Jika sudah final dan siap ke pengguna:          │
│     npm run deploy:prod                             │
│     (+ buat deployment baru manual di GAS)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📌 Ringkasan Cepat

| Perintah | Tujuan | Update /exec? |
|---|---|---|
| `watch:staging` | Live coding staging | ❌ (hanya /dev) |
| `deploy:staging` | Push ke staging | ❌ (hanya /dev) |
| `release:staging` | Rilis ke staging exec | ✅ |
| `deploy:prod` | Push ke production | ❌ (manual deploy) |
| `clasp:pengawas:pull` | Sync kode dari GAS | - |
| `clasp:madrasah:push` | Push app Madrasah | - |
