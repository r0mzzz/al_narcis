export const Templates = {
  passwordReset: `
  <!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Təsdiqi</title>
  <style>
    /* General resets */
    body, html {
      margin: 0;
      padding: 0;
      font-family: 'Helvetica', Arial, sans-serif;
      background-color: #f4f6f8;
      color: #333333;
    }

    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      overflow: hidden;
      padding: 30px;
    }

    .header {
      text-align: center;
      background-color: #6C63FF;
      color: white;
      padding: 20px;
      border-radius: 10px 10px 0 0;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
    }

    .content {
      text-align: center;
      padding: 30px 20px;
    }

    .content p {
      font-size: 16px;
      line-height: 1.5;
    }

    .otp-code {
      display: inline-block;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 6px;
      background-color: #f0f0f0;
      padding: 15px 25px;
      border-radius: 8px;
      margin: 20px 0;
      color: #6C63FF;
    }

    .footer {
      text-align: center;
      font-size: 14px;
      color: #888888;
      padding: 20px;
      border-top: 1px solid #eeeeee;
    }

    .footer a {
      color: #6C63FF;
      text-decoration: none;
    }

    @media screen and (max-width: 480px) {
      .otp-code {
        font-size: 24px;
        letter-spacing: 4px;
        padding: 12px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Al Narcis</h1>
    </div>
    <div class="content">
      <p>Salam,</p>
      <p>Təsdiq üçün aşağıdakı OTP kodundan istifadə edin:</p>
      <div class="otp-code">123456</div>
      <p>Bu OTP <strong>3 dəqiqə</strong> etibarlıdır. Zəhmət olmasa, bu kodu heç kimlə paylaşmayın.</p>
      <p><strong>Al Narcis</strong> seçdiyiniz üçün təşəkkür edirik!</p>
    </div>
    <div class="footer">
      &copy; 2025 Al Narcis. Bütün hüquqlar qorunur. <br>
<!--      <a href="https://al-narcis.com">Veb saytımıza daxil olun</a>-->
    </div>
  </div>
</body>
</html>

  `,
};
