# Production Configuration Guide

## Environment Variables Update

Untuk production deployment, update file `.env` dengan konfigurasi berikut:

### Frontend Configuration
```env
FRONTEND_URL=https://autofile.raymaizing.com
CORS_ORIGIN=https://autofile.raymaizing.com
API_BASE_URL=https://api.raymaizing.com
```

### Database Configuration
```env
DB_HOST=your-production-db-host
DB_PORT=3306
DB_NAME=raymaizing_auth
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
```

### Email Configuration
```env
GMAIL_USER=your-production-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
SUPPORT_EMAIL=support@raymaizing.com
```

### Midtrans Configuration (Production)
```env
MIDTRANS_SERVER_KEY=your-production-server-key
MIDTRANS_CLIENT_KEY=your-production-client-key
MIDTRANS_IS_PRODUCTION=true
```

### Security Configuration
```env
JWT_SECRET=your-strong-production-jwt-secret
SESSION_SECRET=your-strong-production-session-secret
NODE_ENV=production
```

## Email Verification Flow

Email verifikasi akan redirect ke:
```
https://autofile.raymaizing.com/verify-email?token={verificationToken}
```

## Password Reset Flow

Email reset password akan redirect ke:
```
https://autofile.raymaizing.com/reset-password?token={resetToken}
```

## Payment Success Callback

Midtrans payment success akan redirect ke:
```
https://autofile.raymaizing.com/payment/success?order_id={orderId}
```

## CORS Configuration

Backend akan accept requests dari:
- `https://autofile.raymaizing.com` (Frontend React app)
- `https://api.raymaizing.com` (API domain)

## Deployment Checklist

- [ ] Update `.env` dengan production values
- [ ] Set `NODE_ENV=production`
- [ ] Update `MIDTRANS_IS_PRODUCTION=true`
- [ ] Configure production database
- [ ] Update JWT and Session secrets
- [ ] Configure production email service
- [ ] Test email verification flow
- [ ] Test password reset flow
- [ ] Test payment callback
- [ ] Verify CORS configuration
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Setup monitoring and logging
- [ ] Configure backup strategy

## Testing Production URLs

### Test Email Verification
1. Register new user
2. Check email for verification link
3. Verify link redirects to `https://autofile.raymaizing.com/verify-email?token=...`
4. Confirm email verification works

### Test Password Reset
1. Request password reset
2. Check email for reset link
3. Verify link redirects to `https://autofile.raymaizing.com/reset-password?token=...`
4. Confirm password reset works

### Test Payment Flow
1. Subscribe to a plan
2. Complete payment in Midtrans
3. Verify redirect to `https://autofile.raymaizing.com/payment/success?order_id=...`
4. Confirm subscription activated

## Important Notes

- **Never commit `.env` file to git**
- Keep production secrets secure
- Use strong passwords for production database
- Enable 2FA for production email account
- Monitor error logs regularly
- Setup automated backups
- Use environment-specific configurations
- Test all flows in staging before production

## Support

For issues or questions:
- Email: support@raymaizing.com
- Documentation: See other MD files in this directory
