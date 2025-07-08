export function eventCreationTemplate(name: string, eventName: string): string {
  return `
    <div style="font-family: sans-serif;">
      <h2>Nice job, ${name}! 🎉</h2>
      <p>Your event "<strong>${eventName}</strong>" has been created successfully.</p>
      <p>Start sharing it with your audience and watch the RSVPs roll in.</p>
      <br />
      <p>– The Ticketer Team</p>
    </div>
  `;
}
