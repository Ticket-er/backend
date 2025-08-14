export function generateOtpTemplate(name: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP - Ticketer</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; margin: 20px auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px; text-align: center;">
            <h1 style="font-size: 24px; color: #333333; margin: 0;">Ticketer</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 20px 20px;">
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Hey ${name},</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your One-Time Password (OTP) is:</p>
            <h3 style="font-size: 24px; color: #1a73e8; margin: 10px 0; letter-spacing: 2px;">${otp}</h3>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">This code will expire in 10 minutes.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">If you didn’t request this, please ignore this email or contact our <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support team</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px; text-align: center;">
            <p style="font-size: 14px; color: #999999; margin: 0;">– The Ticketer Team</p>
          </td>
        </tr>
      </table>
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 10px 0; text-align: center; background-color: #e8ecef; font-size: 12px; color: #666666;">
        <tr>
          <td>
            <p style="margin: 5px 0;">Discover events, buy tickets, and resell securely with <a href="https://ticketer.com" style="color: #1a73e8; text-decoration: underline;">Ticketer</a>.</p>
            <p style="margin: 5px 0;">Manage your funds effortlessly with our wallet system.</p>
            <p style="margin: 5px 0;">Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support@ticketer.com</a>.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
