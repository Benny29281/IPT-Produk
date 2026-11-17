# TOBAPIA — Katalog pemesanan

Website statis HTML, CSS, JavaScript tanpa dependensi runtime dan tanpa proses build. Implementasi berdasarkan `prd (7).md`, dengan ekspor pesanan dan dukungan versi negara.

## Jalankan

Dengan Node.js 20+: `npm run dev`, lalu buka http://127.0.0.1:4173/. Bisa juga melalui web server Laragon. Jangan buka HTML dengan `file://` karena data JSON dimuat lewat fetch.

- `/admin/`: panel admin (Sveltia CMS) untuk CRUD produk, foto, harga, ongkir. Ubah `repo` di `admin/config.yml`. Login dengan token GitHub (PAT, scope repo).
- `/`: katalog tanpa harga; tidak mengunduh `prices.json`.
- `/harga/`: katalog dengan harga dan total estimasi.
- `npm test`: pengujian perhitungan, pemisahan satuan, validasi jumlah, dan format pesan.
- `npm run check`: pemeriksaan sintaks JavaScript.

## Konfigurasi sebelum rilis

1. Edit `config.js`: nama toko, nomor WhatsApp internasional tanpa tanda +, mata uang, batas usia, dan peringatan kesehatan yang sudah diverifikasi untuk wilayah operasional.
2. Ganti produk dan warna contoh di `data/products.json`. Setiap warna perangkat memakai ID terpisah; sticks memakai `pack` dan `carton`, perangkat memakai `unit`.
3. Harga di `data/prices.json` sudah mengikuti tabel yang diberikan: ILUMA i Rp899.000, ILUMA i One Rp349.000, dan ILUMA i Prime Rp1.599.000 per unit. Harga kosong, nol, atau negatif ditandai perlu konfirmasi dan tidak dianggap gratis. Jika menambahkan sticks, harga carton diatur independen dari pack.
4. Foto opsional: tambahkan `"image": "images/nama-produk.webp"` pada produk dan simpan gambarnya di lokasi itu. Tanpa foto ditampilkan ilustrasi CSS berlabel. Kompres foto WebP di bawah 150 KB sesuai PRD.
5. Ubah `demo` menjadi `false` setelah seluruh data diverifikasi. Pengiriman WhatsApp dinonaktifkan sampai nomor diisi; salin pesanan tetap berfungsi.

## Perilaku

Antarmuka tersedia dalam bahasa Inggris, Indonesia, dan Mandarin sederhana. Pilih EN / ID / 中文 pada header atau dialog konfirmasi usia. Pilihan disimpan di localStorage; pergantian bahasa mempertahankan kategori, kata pencarian, jumlah pesanan, nama, dan catatan. Tombol, label, pesan validasi, deskripsi/spesifikasi produk, serta teks WhatsApp/clipboard mengikuti bahasa yang dipilih. Nama produk Inggris dan Mandarin tetap ditampilkan bersama. Bahasa awal diatur melalui `defaultLanguage` (`en`, `id`, atau `zh`) pada `config.js`.

Terjemahan antarmuka ada di `assets/js/i18n.js`. Data terjemahan produk memakai akhiran `En`, `Id`, dan `Zh` pada `description`, `flavor`, serta `specifications[].label` dan `value` bila diperlukan. `scripts/localize-products.mjs` dapat dijalankan kembali untuk memperbarui terjemahan dari pemetaan yang tersedia. Data nama, rasa asli, dan harga dari tabel pengguna tetap dipertahankan; ejaan rasa pada tampilan Inggris dinormalisasi, termasuk Cengkeh → Clove. Teks yang sudah tercetak di foto sumber tetap merupakan bagian dari foto asli.

Jumlah dibatasi 0–999, dibulatkan ke bawah. Pilihan pesanan, nama, dan catatan disimpan di memori halaman dan hilang saat refresh. Reset dengan konfirmasi menghapus semuanya. Persetujuan usia disimpan di sessionStorage; bila penyimpanan diblokir, persetujuan berlaku selama halaman terbuka. Katalog baru dimuat setelah persetujuan. Gerbang ini merupakan pernyataan mandiri, bukan verifikasi identitas atau jaminan kepatuhan hukum.

WhatsApp membuka chat dengan teks terisi; pelanggan tetap harus mengirim pesan. Tidak ada konfirmasi pengiriman atau database pesanan. Clipboard memakai API browser dengan dialog salin manual sebagai cadangan. Nama dan catatan hanya masuk dalam teks yang dikirim/disalin pelanggan.

## Ekspor daftar pesanan

1. Pilih produk, satuan, dan jumlahnya.
2. Klik **Download PDF / Unduh PDF / 下载 PDF**. File dibuat dan langsung diunduh tanpa dialog ekspor tambahan.

PDF memakai ukuran A4 dan otomatis berpindah halaman untuk pesanan panjang. Nama Inggris dan Mandarin tampil bersama. Kolom versi negara menampilkan nama negara beserta kode, misalnya Indonesia (ID), South Korea (KR), atau Japan (JP). Nama negara diterjemahkan sesuai bahasa antarmuka; kode tetap sama. Produk batang tembakau wajib memiliki kode negara sebelum dapat diekspor. Bahasa judul, satuan, dan label mengikuti bahasa saat tombol unduh diklik. Halaman `/` menghasilkan dokumen tanpa harga; `/harga/` mencantumkan harga satuan, subtotal, dan total. Harga yang belum tersedia tetap ditandai perlu konfirmasi.

File dibuat sepenuhnya di perangkat pengguna, tanpa upload atau sistem pemesanan perusahaan. Format file netral, tanpa logo atau nomor WhatsApp perusahaan, sehingga CS maupun pelanggan dapat membagikannya ke penjual pilihan mereka. Setiap unduhan memakai salinan isi keranjang saat tombol diklik; perubahan keranjang berikutnya tidak mengubah file yang sudah dibuat. Klik unduh kembali untuk menghasilkan PDF baru.

PDF berbasis gambar untuk menjaga tampilan karakter Mandarin lintas perangkat; teks PDF tidak dapat dipilih. Tombol salin pesanan tetap tersedia untuk kebutuhan teks. Hanya PDF yang ditawarkan sebagai file unduhan. Dukungan penyimpanan file mengikuti browser/perangkat pengguna.

WhatsApp tetap merupakan pilihan tambahan. Atur `whatsappEnabled: false` di `config.js` untuk menyembunyikan tombol dan petunjuk WhatsApp pada katalog mandiri; ekspor dan salin pesanan tetap berfungsi. Mengganti branding cukup melalui konfigurasi toko.

## Versi negara

Katalog memakai satu daftar produk dengan filter negara: Indonesia (`ID`), Korea Selatan (`KR`), dan Jepang (`JP`). Versi negara dicantumkan pada kartu, detail, ringkasan, pesan WhatsApp, dan PDF. Filter negara berlaku untuk batang tembakau, bukan negara pembuatan perangkat. Saat memilih kategori perangkat, filter kembali ke semua versi.

Saat ini 21 TEREA yang tersedia merupakan versi Indonesia. Opsi Korea/Jepang menampilkan 0 sampai produk asli ditambahkan; tidak ada inventori atau harga contoh yang dipublikasikan.

Untuk menambahkan versi negara lain, buat entri SKU terpisah di `data/products.json` dengan `id` unik, `country` berisi `KR` atau `JP`, dan `familyId` yang sama dengan keluarga produk terkait. Lengkapi nama, terjemahan, foto, deskripsi, spesifikasi, serta `units`. Tambahkan harga menggunakan ID baru di `data/prices.json` dan catat foto pada `data/product-sources.json`. Setiap SKU negara memiliki jumlah dan harga sendiri; produk dari beberapa negara dapat berada dalam satu pesanan. Kolom `country` menyatakan versi pasar/negara produk, bukan klaim lokasi produksi pabrik.

## Verifikasi ekspor

`npm test` mencakup pemisahan SKU per negara, pencarian tiga bahasa, salinan pesanan yang tidak berubah, penghilangan harga pada versi tanpa harga, dan independensi ekspor dari kontak perusahaan.

Pemeriksaan visual opsional tersedia di `scripts/verify-order-export.mjs`. Alat ini memakai `@napi-rs/canvas` dan `pdfjs-dist@4.8.69` pada folder QA sementara di luar proyek. Jalankan `node scripts/verify-order-export.mjs <folder-paket-QA>` untuk membuat tiga contoh dan merender setiap halaman PDF kembali ke PNG di `tmp/pdfs/`. Dependensi QA tidak diperlukan oleh website dan `tmp/` tidak ikut version control. Contoh yang diperiksa mencakup Inggris dengan harga, Mandarin tanpa harga, serta pesanan Indonesia 34 produk dan catatan panjang.

## GitHub Pages

Unggah seluruh proyek ke repository. Pilih Settings → Pages → Deploy from a branch → main → / (root). Kedua halaman mendukung subpath repository karena URL data ditentukan relatif terhadap modul aplikasi. File `.nojekyll` tersedia agar file statis disajikan langsung.

Harga dan seluruh aset di hosting statis dapat diakses publik. Halaman tanpa harga bukan kontrol akses. Font Google opsional dimuat dari layanan eksternal; fallback font sistem tersedia. Hapus `@import` di CSS jika ingin menghindari permintaan font eksternal.

## Status

Katalog berisi 34 produk: 13 perangkat (5 Iqos Iluma i, 4 Iqos Iluma i One, dan 4 Iqos Iluma i Prime) serta 21 TEREA sticks. Nama Inggris (`name`), nama Mandarin (`nameZh`), rasa (`flavor`), urutan, dan harga mengikuti tabel pengguna. Pencarian mendukung kedua nama serta rasa. Nama dalam kedua bahasa juga dicantumkan di ringkasan dan teks pesanan. Halaman `/` tetap tanpa harga; harga dan total tampil di `/harga/`.

Katalog aktif memakai 112 foto WebP: 91 foto perangkat dari Drive dan seluruh 21 foto TEREA milik pengguna dari folder `13qivqSLdSbocYmgUxaIfZXKUJQZoIWhL`. Green, Passion Fruit, Strawberry Pearl, dan Sun Pearl sudah diperbarui dari tambahan foto pengguna. File PSD tidak dipasang sebagai foto produk. Setiap foto di bawah 150 KB. Dari 106 foto perangkat yang sudah diunduh, foto Vivid Terracota dan Prime Aspen Green tetap tersimpan tetapi kedua produk itu tidak ditampilkan karena tidak ada di daftar perangkat. Klik foto produk untuk membuka detail; produk dengan beberapa foto memiliki navigasi galeri. Foto tetap utuh tanpa pemotongan.

Daftar TEREA dari pengguna disimpan di `data/terea-customer-list.json` sebagai referensi. Katalog aktif dan harga tetap dibaca dari `products.json` dan `prices.json`. Harga Pack (20 sticks) dan Carton (10 pack / 200 sticks) disimpan independen. Pelanggan memilih salah satu satuan per produk sebelum mengisi jumlah melalui satu kontrol +/−. Mengganti satuan mengosongkan jumlah produk tersebut; pesanan produk lain tetap tersimpan. Pilihan satuan bertahan saat berpindah kategori atau bahasa, dan kembali kosong setelah reset. Perangkat IQOS tetap memakai Unit tanpa pilihan satuan. Rasa dari tabel pengguna menggantikan rasa retailer sebelumnya. Passion Fruit dan Strawberry Pearl tidak diberi angka nikotin, durasi, berat, atau dimensi yang belum diverifikasi. Produk Emerald, Minago, dan Scarlet dari referensi lama tidak ditambahkan karena tidak ada di daftar baru.

Setiap produk memiliki `description`, `specifications`, dan `descriptionSources` di `data/products.json`. Klik foto, nama, atau area kartu produk untuk membuka jendela detail berisi galeri, deskripsi, dan spesifikasi. Pada desktop, foto dan deskripsi tampil berdampingan; pada HP, deskripsi ada di bawah galeri. Harga detail hanya tampil pada `/harga/`. Tombol jumlah di kartu tetap mengatur pesanan. Jendela detail bisa ditutup dengan tombol silang atau Escape. Tautan sumber tidak ditampilkan pada detail produk, sesuai permintaan pengguna. Deskripsi perangkat merujuk dokumentasi resmi IQOS. File `terea-indonesia-descriptions.md` dan `data/terea-indonesia-descriptions.json` adalah referensi awal 22 produk retailer; katalog aktif memakai pilihan, nama, dan rasa dari tabel pengguna terbaru.

Daftar sumber dan pemetaan foto produk aktif ada di `data/product-sources.json`. Batas usia 21+ mengikuti label materi foto, bukan hasil verifikasi regulasi. Branding tetap contoh. Nomor WhatsApp pemesanan diatur ke +86 188 0451 9859 melalui `config.js`. Perubahan lokal ini belum dipush atau dipublikasikan. Pemeriksaan browser/perangkat asli dan konfirmasi aturan wilayah masih diperlukan sebelum rilis.

`scripts/prepare-images.php` merupakan alat bantu konversi gambar memakai PHP GD/WebP; PHP tidak dibutuhkan untuk menjalankan website statis. File PNG asli disimpan sementara di luar folder proyek dan tidak perlu dipush.
