export function eventCreationTemplate(name: string, eventName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Created - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Nice job, ${name}! 🎉</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your event "<strong>${eventName}</strong>" has been created successfully.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Start sharing it with your audience and watch the ticket sales roll in. Manage your event and track sales at <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">your dashboard</a>.</p>
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
