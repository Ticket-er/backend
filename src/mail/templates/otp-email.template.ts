export function generateOtpTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 1rem; max-width: 500px; margin: auto;">
      <h2>Hi ${name || 'there'},</h2>
      <p>Thank you for using Ticket.</p>
      <p>Your OTP code is:</p>
      <div style="font-size: 24px; font-weight: bold; margin: 1rem 0;">${otp}</div>
      <p>This code is valid for <strong>10 minutes</strong>.</p>
      <p>If you didn't request this, you can ignore this email.</p>
      <br />
      <p>— The Ticket-er Team</p>
    </div>
  `;
}
