# Setup Email Service (Gmail - Gratis)

## Langkah-langkah Setup Gmail untuk Mengirim Email

### 1. Persiapan Akun Gmail

1. **Buat atau gunakan akun Gmail** yang akan digunakan untuk mengirim email
2. **Aktifkan 2-Factor Authentication** di akun Gmail Anda:
   - Buka [Google Account Security](https://myaccount.google.com/security)
   - Pilih "2-Step Verification"
   - Ikuti langkah-langkah untuk mengaktifkan

### 2. Generate App Password

1. **Buka Google Account Settings**:
   - Kunjungi [https://myaccount.google.com/](https://myaccount.google.com/)
   - Pilih "Security" di sidebar kiri

2. **Generate App Password**:
   - Scroll ke bawah ke bagian "Signing in to Google"
   - Klik "App passwords" (hanya muncul jika 2FA sudah aktif)
   - Pilih "Mail" sebagai app
   - Pilih "Other (Custom name)" sebagai device
   - Ketik "RAYMAIZING API" sebagai nama
   - Klik "Generate"

3. **Salin App Password**:
   - Google akan memberikan 16-digit password
   - Salin password ini (tanpa spasi)

### 3. Update Environment Variables

Edit file `.env` dan update bagian email:

```env
# Email Configuration (Gmail - Free)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
SUPPORT_EMAIL=support@raymaizing.com
```

**Contoh:**
```env
GMAIL_USER=raymaizing.noreply@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
SUPPORT_EMAIL=support@raymaizing.com
```

### 4. Test Email Service

Setelah setup, restart server Express.js dan coba registrasi user baru. Email verifikasi akan dikirim otomatis.

## Alternatif Email Service Gratis Lainnya

### 1. **Mailtrap** (Gratis - 100 email/bulan)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

### 2. **SendGrid** (Gratis - 100 email/hari)
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 3. **Mailgun** (Gratis - 5000 email/bulan untuk 3 bulan pertama)
```env
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
```

## Troubleshooting

### Error: "Invalid login"
- Pastikan 2FA sudah aktif di Gmail
- Pastikan menggunakan App Password, bukan password biasa
- Periksa username dan password di .env

### Error: "Less secure app access"
- Gmail sudah tidak mendukung "less secure apps"
- Harus menggunakan App Password dengan 2FA

### Email tidak terkirim
- Periksa log server untuk error details
- Pastikan koneksi internet stabil
- Cek quota email harian Gmail (500 email/hari untuk akun gratis)

## Keamanan

- **Jangan commit** file .env ke Git
- **Gunakan akun Gmail terpisah** untuk aplikasi
- **Monitor penggunaan** email untuk menghindari spam
- **Backup App Password** di tempat yang aman

## Fitur Email Template

Email yang dikirim sudah include:
- ✅ HTML template yang responsive
- ✅ Branding RAYMAIZING
- ✅ Link verifikasi yang aman
- ✅ Kode verifikasi manual
- ✅ Instruksi keamanan
- ✅ Footer dengan contact info

## Monitoring

Log email akan tersimpan di:
- Console output (development)
- File log: `logs/combined.log`
- Error log: `logs/error.log`