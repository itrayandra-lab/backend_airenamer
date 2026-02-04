const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter for Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password (not regular password)
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, verificationToken, userName) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: {
        name: 'RAYMAIZING - AI Pengatur File',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: '🔐 Verifikasi Email Anda - RAYMAIZING',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifikasi Email - RAYMAIZING</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; }
            .message { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 30px; }
            .button-container { text-align: center; margin: 40px 0; }
            .verify-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold; 
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              transition: transform 0.2s;
            }
            .verify-button:hover { transform: translateY(-2px); }
            .token-box { 
              background-color: #f8f9fa; 
              border: 2px dashed #dee2e6; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .token { 
              font-family: 'Courier New', monospace; 
              font-size: 24px; 
              font-weight: bold; 
              color: #495057; 
              letter-spacing: 2px; 
            }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6; }
            .footer p { color: #6c757d; font-size: 14px; margin: 5px 0; }
            .security-notice { 
              background-color: #fff3cd; 
              border: 1px solid #ffeaa7; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0; 
            }
            .security-notice strong { color: #856404; }
            .security-notice p { color: #856404; margin: 0; font-size: 14px; }
            @media (max-width: 600px) {
              .content { padding: 20px; }
              .header { padding: 30px 20px; }
              .verify-button { padding: 14px 28px; font-size: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 RAYMAIZING</h1>
              <p>AI Pengatur File Terdepan</p>
            </div>
            
            <div class="content">
              <h2 class="welcome">Halo ${userName}! 👋</h2>
              
              <p class="message">
                Terima kasih telah mendaftar di <strong>RAYMAIZING</strong>! Untuk mengaktifkan akun Anda dan mulai menggunakan fitur AI pengatur file yang canggih, silakan verifikasi email Anda.
              </p>
              
              <div class="button-container">
                <a href="${verificationUrl}" class="verify-button">
                  ✅ Verifikasi Email Sekarang
                </a>
              </div>
              
              <p style="text-align: center; color: #666; font-size: 14px; margin: 20px 0;">
                Atau salin dan tempel kode verifikasi berikut:
              </p>
              
              <div class="token-box">
                <div class="token">${verificationToken}</div>
                <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
                  Kode verifikasi (berlaku 24 jam)
                </p>
              </div>
              
              <div class="security-notice">
                <strong>🔒 Keamanan Penting:</strong>
                <p>
                  • Link verifikasi ini berlaku selama 24 jam<br>
                  • Jangan bagikan kode ini kepada siapa pun<br>
                  • Jika Anda tidak mendaftar, abaikan email ini
                </p>
              </div>
              
              <p class="message">
                Setelah verifikasi, Anda dapat menikmati:
              </p>
              <ul style="color: #666; line-height: 1.8;">
                <li>🤖 AI pengatur file otomatis</li>
                <li>📁 Organisasi file yang cerdas</li>
                <li>⚡ Proses batch yang cepat</li>
                <li>📊 Analitik penggunaan</li>
              </ul>
            </div>
            
            <div class="footer">
              <p><strong>RAYMAIZING Team</strong></p>
              <p>Email: ${process.env.SUPPORT_EMAIL || 'support@raymaizing.com'}</p>
              <p>Website: <a href="${process.env.FRONTEND_URL}" style="color: #667eea;">raymaizing.com</a></p>
              <p style="margin-top: 20px; font-size: 12px;">
                © 2024 RAYMAIZING. Semua hak dilindungi undang-undang.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Halo ${userName}!
        
        Terima kasih telah mendaftar di RAYMAIZING!
        
        Untuk mengaktifkan akun Anda, silakan verifikasi email dengan mengklik link berikut:
        ${verificationUrl}
        
        Atau gunakan kode verifikasi: ${verificationToken}
        
        Kode ini berlaku selama 24 jam.
        
        Jika Anda tidak mendaftar, abaikan email ini.
        
        Salam,
        Tim RAYMAIZING
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`, { messageId: result.messageId });
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    logger.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'RAYMAIZING - AI Pengatur File',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: '🔑 Reset Password Anda - RAYMAIZING',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - RAYMAIZING</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 40px 30px; }
            .message { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 30px; }
            .button-container { text-align: center; margin: 40px 0; }
            .reset-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold; 
              font-size: 16px;
            }
            .warning { 
              background-color: #fff3cd; 
              border: 1px solid #ffeaa7; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0; 
              color: #856404;
            }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6; }
            .footer p { color: #6c757d; font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 RAYMAIZING</h1>
              <p>Reset Password</p>
            </div>
            
            <div class="content">
              <h2>Halo ${userName}!</h2>
              
              <p class="message">
                Kami menerima permintaan untuk mereset password akun RAYMAIZING Anda. 
                Klik tombol di bawah untuk membuat password baru:
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">
                  🔑 Reset Password
                </a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Penting:</strong>
                <p>
                  • Link ini berlaku selama 10 menit<br>
                  • Jika Anda tidak meminta reset password, abaikan email ini<br>
                  • Password lama Anda masih aktif sampai Anda membuat yang baru
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>RAYMAIZING Team</strong></p>
              <p>Jika Anda memerlukan bantuan, hubungi: ${process.env.SUPPORT_EMAIL || 'support@raymaizing.com'}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Halo ${userName}!
        
        Kami menerima permintaan untuk mereset password akun RAYMAIZING Anda.
        
        Klik link berikut untuk reset password (berlaku 10 menit):
        ${resetUrl}
        
        Jika Anda tidak meminta reset password, abaikan email ini.
        
        Salam,
        Tim RAYMAIZING
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`, { messageId: result.messageId });
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send welcome email with temporary password
const sendWelcomeEmail = async (email, { name, tempPassword, loginUrl }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'RAYMAIZING - AI Pengatur File',
        address: process.env.GMAIL_USER
      },
      to: email,
      subject: '🎉 Selamat Datang di RAYMAIZING - Akun Anda Telah Dibuat!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Selamat Datang - RAYMAIZING</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; }
            .message { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 30px; }
            .credentials-box { 
              background-color: #f0f9ff; 
              border: 2px solid #0ea5e9; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .credentials-title { color: #0369a1; font-weight: bold; margin-bottom: 15px; }
            .credential-item { margin: 10px 0; }
            .credential-label { color: #374151; font-weight: 500; }
            .credential-value { 
              font-family: 'Courier New', monospace; 
              background-color: #e5e7eb; 
              padding: 8px 12px; 
              border-radius: 4px; 
              display: inline-block; 
              margin-left: 10px;
              color: #1f2937;
            }
            .button-container { text-align: center; margin: 40px 0; }
            .login-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold; 
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
            }
            .security-notice { 
              background-color: #fef3c7; 
              border: 1px solid #f59e0b; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0; 
            }
            .security-notice strong { color: #92400e; }
            .security-notice p { color: #92400e; margin: 0; font-size: 14px; }
            .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6; }
            .footer p { color: #6c757d; font-size: 14px; margin: 5px 0; }
            .features { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .features h3 { color: #374151; margin-top: 0; }
            .features ul { color: #6b7280; line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 RAYMAIZING</h1>
              <p>Selamat Datang di AI Pengatur File Terdepan!</p>
            </div>
            
            <div class="content">
              <h2 class="welcome">Halo ${name}! 👋</h2>
              
              <p class="message">
                Selamat! Akun RAYMAIZING Anda telah berhasil dibuat melalui proses pembayaran. 
                Kami telah membuatkan kredensial login untuk Anda:
              </p>
              
              <div class="credentials-box">
                <div class="credentials-title">🔐 Informasi Login Anda:</div>
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password Sementara:</span>
                  <span class="credential-value">${tempPassword}</span>
                </div>
              </div>
              
              <div class="security-notice">
                <strong>🔒 Keamanan Penting:</strong>
                <p>
                  • Segera ganti password sementara ini setelah login pertama<br>
                  • Jangan bagikan kredensial ini kepada siapa pun<br>
                  • Simpan informasi ini di tempat yang aman
                </p>
              </div>
              
              <div class="button-container">
                <a href="${loginUrl}" class="login-button">
                  🚀 Login Sekarang
                </a>
              </div>
              
              <div class="features">
                <h3>🌟 Fitur yang Dapat Anda Nikmati:</h3>
                <ul>
                  <li>🤖 AI pengatur file otomatis dan cerdas</li>
                  <li>📁 Organisasi file berdasarkan kategori</li>
                  <li>⚡ Proses batch yang super cepat</li>
                  <li>📊 Dashboard analitik penggunaan</li>
                  <li>🔄 Backup otomatis dan restore</li>
                </ul>
              </div>
              
              <p class="message">
                Tim support kami siap membantu Anda 24/7. Jangan ragu untuk menghubungi kami 
                jika ada pertanyaan atau butuh bantuan menggunakan RAYMAIZING.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>RAYMAIZING Team</strong></p>
              <p>Email Support: ${process.env.SUPPORT_EMAIL || 'support@raymaizing.com'}</p>
              <p>Website: <a href="${process.env.FRONTEND_URL}" style="color: #10b981;">raymaizing.com</a></p>
              <p style="margin-top: 20px; font-size: 12px;">
                © 2025 RAYMAIZING. Semua hak dilindungi undang-undang.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Selamat Datang di RAYMAIZING!
        
        Halo ${name}!
        
        Akun RAYMAIZING Anda telah berhasil dibuat. Berikut informasi login Anda:
        
        Email: ${email}
        Password Sementara: ${tempPassword}
        
        Login di: ${loginUrl}
        
        PENTING: Segera ganti password sementara ini setelah login pertama.
        
        Fitur yang dapat Anda nikmati:
        - AI pengatur file otomatis
        - Organisasi file yang cerdas
        - Proses batch yang cepat
        - Sinkronisasi cloud
        - Dashboard analitik
        
        Butuh bantuan? Hubungi: ${process.env.SUPPORT_EMAIL || 'support@raymaizing.com'}
        
        Salam,
        Tim RAYMAIZING
      `
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`, { messageId: result.messageId });
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email service connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  testEmailConnection
};