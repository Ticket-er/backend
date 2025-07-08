export function registrationTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Welcome aboard, ${name} 🎉</h2>
      <p>Thanks for joining Ticketer. You can now create and attend amazing events.</p>
      <p>We're excited to have you with us!</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
