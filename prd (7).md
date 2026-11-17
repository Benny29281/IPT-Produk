# PRD: Digital Menu Pemesanan (Order Catalog)

| | |
|---|---|
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 16 November 2026 |
| **Status** | Menunggu konfirmasi klien |
| **Target rilis** | ASAP, tidak terburu-buru (estimasi 3–5 hari kerja setelah data produk lengkap) |
| **Hosting** | GitHub Pages (static site) |

---

## 1. Ringkasan

Klien ingin halaman web sederhana agar pelanggan dapat memilih produk beserta jumlahnya, lalu sistem otomatis membuat **daftar pesanan** yang bisa dikirim ke klien. Halaman ini **hanya untuk mempermudah pemesanan**, tanpa pembayaran, tanpa login, dan tanpa database.

## 2. Tujuan dan Non-Tujuan

### Tujuan
- Mempermudah pelanggan membuat pesanan tanpa mengetik daftar manual.
- Memastikan format pesanan yang diterima klien seragam dan jelas.
- Menyediakan dua versi menu: **dengan harga** dan **tanpa harga**, dari satu basis kode.

### Non-Tujuan (di luar scope)
- Pembayaran online / payment gateway.
- Akun pelanggan, login, riwayat pesanan.
- Manajemen stok real-time.
- Panel admin / CMS (update produk dilakukan lewat edit file data).

## 3. Pengguna

| Pengguna | Kebutuhan |
|---|---|
| **Pelanggan** | Memilih produk dan jumlah dengan cepat lewat HP, lalu mengirim pesanan. |
| **Klien / tim penjualan** | Menerima daftar pesanan yang rapi dan mudah diproses. |
| **Tim IT** | Mengelola produk dan harga dengan mudah tanpa mengubah kode. |

## 4. Kebutuhan Fungsional

### 4.1 Katalog produk
- **FR-01** Menampilkan daftar produk, dikelompokkan per kategori (mis. Sticks/Rokok, Perangkat IQOS).
- **FR-02** Setiap produk menampilkan nama, varian/rasa, dan foto (opsional).
- **FR-03** Fitur pencarian dan/atau filter kategori agar daftar mudah dinavigasi.

### 4.2 Perangkat IQOS
- **FR-04** Perangkat IQOS **wajib ditampilkan**.
- **FR-05** **Setiap warna ditampilkan sebagai item terpisah** (satu baris/kartu per warna), dengan swatch atau foto warna, sehingga pelanggan memilih warna spesifik.
- **FR-06** Perangkat dipesan dalam satuan **unit** (bukan pack/carton).

### 4.3 Satuan Pack dan Carton
- **FR-07** Untuk produk rokok/sticks, tersedia dua input terpisah:
  - **Pack**: 1 pack = 20 batang (sticks)
  - **Carton**: 1 carton = 10 pack = 200 batang
- **FR-08** Label satuan harus selalu terlihat jelas di setiap produk, mis. "Pack (20 batang)" dan "Carton (10 pack)".
- **FR-09** Pelanggan dapat mengisi jumlah Pack dan Carton sekaligus untuk produk yang sama; keduanya dihitung sebagai baris terpisah di ringkasan.
- **FR-10** Input jumlah menggunakan tombol **+ / −** dan bisa diketik manual (hanya bilangan bulat ≥ 0).

### 4.4 Ringkasan dan pengiriman pesanan
- **FR-11** Ringkasan pesanan terbentuk otomatis dan hanya menampilkan item dengan jumlah > 0.
- **FR-12** Ringkasan menampilkan: nama produk, satuan, jumlah (dan harga + total pada versi berharga).
- **FR-13** Kolom opsional: **nama pelanggan** dan **catatan**.
- **FR-14** Tombol **"Kirim via WhatsApp"**: membuka WhatsApp (`wa.me`) ke nomor klien dengan teks pesanan terisi otomatis.
- **FR-15** Tombol **"Salin Pesanan"**: menyalin teks pesanan ke clipboard (cadangan jika WhatsApp tidak tersedia).
- **FR-16** Tombol **"Reset"** untuk mengosongkan semua jumlah.
- **FR-17** Tombol kirim nonaktif jika belum ada item yang dipilih.

**Contoh format teks pesanan:**

```
PESANAN BARU
Nama: Budi
Tanggal: 16/11/2026

1. [Produk A] - Pack x 3
2. [Produk A] - Carton x 1
3. IQOS ILUMA - Midnight Black x 1

Catatan: Kirim sore hari
```

(Pada versi berharga ditambahkan harga per baris dan **Total**.)

### 4.5 Dua versi menu

| Versi | URL | Perilaku |
|---|---|---|
| **Tanpa harga** | `/` (default) | Tidak ada harga maupun total. |
| **Dengan harga** | `/harga/` | Menampilkan harga per pack/carton/unit dan total otomatis. |

- **FR-18** Kedua versi memakai **satu kode dan satu sumber data produk**, sehingga selalu sinkron.
- **FR-19** Harga carton bisa berbeda dari 10 × harga pack; harga carton diatur sendiri di data (lihat bagian 6).

### 4.6 Verifikasi usia
- **FR-20** Menampilkan notifikasi/gerbang usia **18+** (atau sesuai aturan setempat) saat halaman pertama dibuka, dengan peringatan kesehatan sesuai regulasi.
- **FR-21** Pilihan pelanggan disimpan di `sessionStorage`/`localStorage` agar tidak ditanya berulang pada sesi yang sama.

## 5. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Responsif** | Mobile-first; nyaman dipakai di layar ≥ 360 px. |
| **Performa** | Halaman termuat < 3 detik di jaringan 4G; gambar dikompresi (WebP, < 150 KB per gambar). |
| **Kompatibilitas** | Chrome, Safari, Firefox, Edge versi terbaru; Android dan iOS. |
| **Aksesibilitas** | Kontras warna memadai, ukuran tombol minimal 44×44 px, label input jelas. |
| **Kemudahan update** | Produk dan harga diubah lewat satu file data tanpa menyentuh kode tampilan. |
| **Privasi** | Tidak ada pengumpulan atau penyimpanan data pelanggan di server. |
| **Bahasa** | Default Bahasa Inggris atau Indonesia (menunggu konfirmasi); struktur teks dipisah agar mudah diterjemahkan. |

## 6. Struktur Data Produk

Satu file `data/products.json`. Harga dipisah agar versi tanpa harga tidak memuat angka harga.

**`data/products.json`**

```json
[
  {
    "id": "sku-001",
    "category": "sticks",
    "name": "Nama Produk A",
    "variant": "Regular",
    "image": "images/sku-001.webp",
    "units": ["pack", "carton"]
  },
  {
    "id": "iqos-iluma-black",
    "category": "device",
    "name": "IQOS ILUMA",
    "variant": "Midnight Black",
    "color": "#1a1a1a",
    "image": "images/iqos-iluma-black.webp",
    "units": ["unit"]
  }
]
```

**`data/prices.json`** (hanya dimuat oleh versi berharga)

```json
{
  "sku-001": { "pack": 0, "carton": 0 },
  "iqos-iluma-black": { "unit": 0 }
}
```

> Nilai harga di atas masih placeholder dan akan diisi dari klien.

## 7. Struktur Proyek

```
digital-menu/
├── index.html          # versi tanpa harga
├── harga/
│   └── index.html      # versi dengan harga
├── assets/
│   ├── css/style.css
│   └── js/app.js       # logika bersama
├── data/
│   ├── products.json
│   └── prices.json
├── images/
├── config.js           # nomor WhatsApp, nama toko, batas usia, bahasa
├── prd.md
└── README.md
```

## 8. Teknologi

- **HTML, CSS, JavaScript murni** (tanpa framework dan tanpa backend), agar sederhana dan mudah dirawat tim IT.
- Hosting statis di **GitHub Pages**.
- Opsional: Tailwind CSS via CDN, atau CSS biasa.

## 9. Deployment: GitHub Pages

1. Buat repository baru di GitHub (mis. `digital-menu`).
2. Push seluruh file proyek ke branch `main`.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Simpan. Situs aktif dalam beberapa menit di:
   `https://<username>.github.io/digital-menu/`
6. (Opsional) Domain kustom: tambahkan domain di **Settings → Pages → Custom domain**, lalu atur DNS (CNAME) ke `<username>.github.io`. Aktifkan **Enforce HTTPS**.

**Catatan penting untuk GitHub Pages:**
- Gunakan **path relatif** (`./assets/...`, bukan `/assets/...`), karena situs berjalan di sub-path `/digital-menu/`.
- Situs bersifat **publik**. Jangan menaruh data sensitif di repository.
- Untuk repository privat, GitHub Pages memerlukan paket berbayar tertentu; gunakan repo publik jika memakai paket gratis.
- Setiap `git push` ke `main` otomatis memperbarui situs (biasanya 1–3 menit).

## 10. Risiko dan Catatan

| Risiko | Penjelasan | Mitigasi |
|---|---|---|
| **Harga tidak benar-benar privat** | Pada situs statis, file `prices.json` bisa diakses siapa pun yang tahu URL-nya. | Jangan tautkan `/harga/` secara publik; bagikan hanya ke pelanggan tertentu. Jika harus benar-benar rahasia, perlu hosting dengan autentikasi. |
| **Regulasi produk tembakau** | Penjualan/promosi online produk tembakau dibatasi di banyak wilayah. | Klien memastikan kepatuhan hukum setempat; sediakan gerbang usia dan peringatan kesehatan. |
| **Pesanan lewat WhatsApp** | Bergantung pada aplikasi WhatsApp terpasang di perangkat pelanggan. | Sediakan tombol "Salin Pesanan" sebagai cadangan. |
| **Data produk berubah** | Produk/harga/warna bisa berubah sewaktu-waktu. | Semua data di file JSON; update lewat commit sederhana. |

## 11. Kriteria Penerimaan

- [ ] Semua warna IQOS tampil sebagai item terpisah dan dapat dipilih satu per satu.
- [ ] Pack dan Carton jelas dibedakan (label 20 batang / 10 pack) dan dapat diisi terpisah.
- [ ] Ringkasan pesanan hanya menampilkan item berjumlah > 0.
- [ ] Versi berharga menampilkan harga dan total yang benar; versi tanpa harga tidak menampilkan harga sama sekali.
- [ ] Tombol WhatsApp membuka chat ke nomor klien dengan teks pesanan yang benar.
- [ ] Tombol salin dan reset berfungsi.
- [ ] Gerbang usia 18+ muncul saat pertama kali dibuka.
- [ ] Tampilan nyaman di HP (Android dan iOS) dan desktop.
- [ ] Situs berhasil diakses lewat URL GitHub Pages.

## 12. Hal yang Harus Dikonfirmasi ke Klien

1. Daftar produk lengkap: nama, varian/rasa, dan foto.
2. Daftar semua warna IQOS yang tersedia, beserta foto.
3. Harga per pack, per carton, dan per unit perangkat. Apakah carton = 10 × harga pack?
4. Nomor WhatsApp atau email penerima pesanan.
5. Bahasa tampilan (Inggris, Indonesia, atau keduanya) serta logo/branding.
6. Batas usia dan teks peringatan yang wajib ditampilkan.
7. Apakah perlu minimum pemesanan atau kelipatan tertentu?

## 13. Rencana Pengerjaan

| Tahap | Estimasi |
|---|---|
| Konfirmasi data dan kebutuhan dari klien | 1–2 hari |
| Desain dan pembuatan halaman (kedua versi) | 2 hari |
| Pengujian di berbagai perangkat | 1 hari |
| Deploy ke GitHub Pages dan serah terima | 0,5 hari |
