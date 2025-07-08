export function ticketResaleTemplate(name: string, ticketName: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Hello ${name},</h2>
      <p>Your ticket "<strong>${ticketName}</strong>" has been listed for resale.</p>
      <p>You’ll get notified when it’s sold.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
