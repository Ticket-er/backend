export function generateOtpTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Hey ${name},</h2>
      <p>Your One-Time Password (OTP) is:</p>
      <h3 style="color: #007bff">${otp}</h3>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
