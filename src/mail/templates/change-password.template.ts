export function changePasswordTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Hey ${name},</h2>
      <p>Your password was successfully changed.</p>
      <p>If this wasn't you, change your password immediately and contact support.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
