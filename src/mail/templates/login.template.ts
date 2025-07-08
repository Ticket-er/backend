export function loginTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Hello again, ${name} 👋</h2>
      <p>You just logged into your Ticketer account.</p>
      <p>If this wasn't you, please reset your password immediately.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
