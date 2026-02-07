# Two-Factor Authentication (2FA) Setup

## Overview
Fitur Autentikasi Dua Faktor (2FA) telah diaktifkan untuk menambahkan lapisan keamanan ekstra pada akun pengguna.

## Backend API Endpoints

### 1. Setup 2FA
**POST** `/api/2fa/setup`
- **Auth**: Required (Bearer Token)
- **Description**: Generate 2FA secret dan QR code
- **Response**:
```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "secret": "BASE32_SECRET",
    "qrCode": "data:image/png;base64,...",
    "manualEntry": "BASE32_SECRET"
  }
}
```

### 2. Verify & Enable 2FA
**POST** `/api/2fa/verify`
- **Auth**: Required (Bearer Token)
- **Body**:
```json
{
  "token": "123456"
}
```
- **Description**: Verify 6-digit code dan aktifkan 2FA
- **Response**:
```json
{
  "success": true,
  "message": "Two-factor authentication enabled successfully"
}
```

### 3. Validate 2FA (During Login)
**POST** `/api/2fa/validate`
- **Auth**: Required (Bearer Token)
- **Body**:
```json
{
  "token": "123456"
}
```
- **Description**: Validate 2FA code saat login
- **Response**:
```json
{
  "success": true,
  "message": "2FA validation successful"
}
```

### 4. Disable 2FA
**POST** `/api/2fa/disable`
- **Auth**: Required (Bearer Token)
- **Body**:
```json
{
  "password": "user_password"
}
```
- **Description**: Nonaktifkan 2FA (memerlukan password)
- **Response**:
```json
{
  "success": true,
  "message": "Two-factor authentication disabled successfully"
}
```

## Frontend Implementation

### Component: TwoFactorModal
Location: `reactjs/src/components/TwoFactorModal.tsx`

**Features:**
- Setup 2FA dengan QR code
- Manual entry untuk secret key
- Verifikasi 6-digit code
- Copy secret key ke clipboard

### Dashboard Integration
Location: `reactjs/src/pages/Dashboard.tsx`

**Features:**
- Tombol "Aktifkan" untuk enable 2FA
- Status indicator (Aktif/Tidak Aktif)
- Modal popup untuk setup

## Cara Menggunakan

### Untuk User:
1. Login ke dashboard
2. Scroll ke bagian "Pengaturan Keamanan"
3. Klik tombol "Aktifkan" pada "Autentikasi Dua Faktor"
4. Scan QR code dengan aplikasi authenticator (Google Authenticator, Microsoft Authenticator, Authy)
5. Masukkan 6-digit code dari aplikator
6. Klik "Verifikasi & Aktifkan"

### Aplikasi Authenticator yang Didukung:
- Google Authenticator (Android/iOS)
- Microsoft Authenticator (Android/iOS)
- Authy (Android/iOS/Desktop)
- 1Password
- LastPass Authenticator

## Database Schema

### User Model Fields:
```javascript
two_factor_enabled: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
two_factor_secret: {
  type: DataTypes.STRING(255),
  allowNull: true
}
```

## Security Notes

1. **Secret Storage**: 2FA secret disimpan terenkripsi di database
2. **Time Window**: Kode valid untuk 2 time steps (±60 detik)
3. **Password Required**: Disable 2FA memerlukan password konfirmasi
4. **Scope Protection**: Secret tidak di-expose di default scope

## Dependencies

### Backend:
- `speakeasy`: Generate dan verify TOTP codes
- `qrcode`: Generate QR code images

### Frontend:
- React Dialog component
- API integration dengan `/api/2fa/*` endpoints

## Testing

### Manual Testing:
1. Start backend: `npm start` di folder `express-backend`
2. Start frontend: `npm run dev` di folder `reactjs`
3. Login ke dashboard
4. Test enable 2FA flow
5. Test disable 2FA flow

### API Testing dengan Postman:
1. Login untuk mendapatkan token
2. Call `/api/2fa/setup` dengan Bearer token
3. Scan QR code atau gunakan secret manual
4. Call `/api/2fa/verify` dengan 6-digit code
5. Verify `two_factor_enabled` = true di database

## Troubleshooting

### QR Code tidak muncul:
- Check console untuk error
- Verify `qrcode` package terinstall
- Check API response di Network tab

### Kode tidak valid:
- Pastikan waktu sistem sinkron (NTP)
- Check time window setting (default: 2)
- Verify secret tersimpan dengan benar

### Cannot disable 2FA:
- Verify password benar
- Check user authentication
- Check database connection

## Future Enhancements

1. Backup codes untuk recovery
2. SMS-based 2FA sebagai alternatif
3. Remember device option
4. 2FA enforcement untuk admin users
5. Audit log untuk 2FA events
