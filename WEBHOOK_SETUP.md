# Setup Webhook Midtrans

## 1. Install ngrok (untuk expose localhost ke internet)

### Download ngrok:
- Kunjungi: https://ngrok.com/download
- Download dan extract ngrok.exe
- Atau install via chocolatey: `choco install ngrok`

### Setup ngrok:
```bash
# Daftar akun di ngrok.com dan dapatkan authtoken
ngrok authtoken YOUR_AUTHTOKEN

# Expose port 5001 (Express server)
ngrok http 5001
```

Setelah menjalankan ngrok, Anda akan mendapat URL seperti:
```
https://abc123.ngrok.io -> http://localhost:5001
```

## 2. Setting Webhook di Midtrans Dashboard

### Login ke Midtrans Dashboard:
- Sandbox: https://dashboard.sandbox.midtrans.com/
- Production: https://dashboard.midtrans.com/

### Setting Webhook URL:
1. Masuk ke **Settings** > **Configuration**
2. Di bagian **Payment Notification URL**, masukkan:
   ```
   https://abc123.ngrok.io/api/subscription/webhook
   ```
3. **Finish Redirect URL** (opsional):
   ```
   https://abc123.ngrok.io/payment/success
   ```
4. **Error Redirect URL** (opsional):
   ```
   https://abc123.ngrok.io/payment/error
   ```
5. Klik **Save**

## 3. Test Webhook

### Cara test webhook:
1. Jalankan server Express: `npm start`
2. Jalankan ngrok: `ngrok http 5001`
3. Update webhook URL di Midtrans dashboard
4. Lakukan transaksi test
5. Cek log server untuk melihat webhook yang masuk

### Log webhook di server:
```javascript
// Webhook akan muncul di console seperti ini:
Webhook received: {
  transaction_time: "2024-02-04 13:30:00",
  transaction_status: "settlement",
  transaction_id: "abc123",
  order_id: "SUB-1234567890-1-10",
  gross_amount: "1000000.00",
  payment_type: "bank_transfer",
  signature_key: "abc123..."
}
```

## 4. Alternative: Manual Activation API

Jika webhook tidak bekerja, gunakan manual activation:

### Endpoint:
```
POST /api/subscription/activate-manual
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "order_id": "SUB-1770183975927-1-10"
}
```

### Contoh menggunakan curl:
```bash
curl -X POST http://localhost:5001/api/subscription/activate-manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "SUB-1770183975927-1-10"}'
```

## 5. Production Setup

### Untuk production:
1. Deploy server ke hosting (Heroku, DigitalOcean, AWS, dll)
2. Gunakan domain/IP public untuk webhook URL
3. Pastikan HTTPS enabled
4. Update Midtrans ke production mode
5. Ganti server key dan client key ke production

### Environment Variables Production:
```env
MIDTRANS_SERVER_KEY=Mid-server-PRODUCTION_KEY
MIDTRANS_CLIENT_KEY=Mid-client-PRODUCTION_KEY
MIDTRANS_IS_PRODUCTION=true
```

## 6. Troubleshooting

### Webhook tidak dipanggil:
- Pastikan ngrok berjalan dan URL benar
- Cek Midtrans dashboard settings
- Lihat log di Midtrans dashboard > Transactions

### Signature verification gagal:
- Pastikan server key benar
- Cek format signature calculation

### Subscription tidak terupdate:
- Cek database connection
- Lihat log error di server
- Gunakan manual activation sebagai fallback