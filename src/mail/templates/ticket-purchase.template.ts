export function ticketPurchaseTemplate(
  name: string,
  ticketName: string,
  event: string,
): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Thanks for your purchase, ${name} 🎟️</h2>
      <p>Your ticket for <strong>${event}</strong> (${ticketName}) is confirmed.</p>
      <p>You’ll receive updates and event details soon.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
