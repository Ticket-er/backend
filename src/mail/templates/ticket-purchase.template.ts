export interface TicketDetails {
  ticketId: string;
  code: string;
  categoryName: string;
  qrCodeDataUrl: string;
}

export function ticketPurchaseBuyerTemplate(
  name: string,
  event: string,
  tickets: TicketDetails[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Ticket Purchase Confirmation - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        Your tickets are confirmed! View your QR codes and event details inside.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">✅</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Thanks for your purchase, ${name}! 
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      Your ticket(s) for <strong style="color: #1e3c72;">${event}</strong> are confirmed
                    </p>
                  </div>

                  <!-- Tickets section -->
                  <h3 style="font-size: 22px; color: #1a1a1a; margin: 0 0 24px 0; font-weight: 600;">
                    🎫 Your Tickets
                  </h3>

                  ${tickets
                    .map(
                      (ticket, index) => `
                        <!-- Ticket card ${index + 1} -->
                        <div style="border: 2px solid #e5e7eb; border-radius: 16px; margin-bottom: 20px; overflow: hidden; position: relative; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);">
                          <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #ff6b6b, #4ecdc4);"></div>
                          <div style="padding: 24px 24px 24px 32px;">
                            <div style="display: table; width: 100%;">
                              <div style="display: table-cell; vertical-align: top; width: 60%;">
                                <h4 style="font-size: 18px; color: #1a1a1a; margin: 0 0 12px 0; font-weight: 600;">
                                  ${ticket.categoryName}
                                </h4>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Ticket ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.ticketId}</code>
                                </p>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Code:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.code}</code>
                                </p>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Category:</strong> ${ticket.categoryName}
                                </p>
                              </div>
                              <div style="display: table-cell; vertical-align: middle; text-align: center; width: 40%;">
                                <div style="background: #ffffff; padding: 12px; border-radius: 12px; border: 2px solid #e5e7eb; display: inline-block;">
                                  <img src="${ticket.qrCodeDataUrl}" alt="QR Code for Ticket ${ticket.ticketId}" style="width: 120px; height: 120px; border-radius: 8px;" />
                                  <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
                                    Scan at venue
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `,
                    )
                    .join('')}

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Please arrive 30 minutes before the event starts</li>
                      <li>Keep your QR code ready for quick entry</li>
                      <li>Tickets are non-transferable and non-refundable</li>
                      <li>Contact support if you encounter any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Discover events, buy tickets, and resell securely</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you purchased tickets through our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketPurchaseOrganizerTemplate(
  organizerName: string,
  event: string,
  ticketCount: number,
  proceeds: number,
  ticketCategories: string[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Ticket Sale Notification - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        New ticket sales for ${event}! Check your proceeds and event details.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">🎉</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      New Ticket Sale, ${organizerName}! 
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      Great news! <strong>${ticketCount}</strong> ticket(s) for <strong style="color: #1e3c72;">${event}</strong> have been sold
                    </p>
                  </div>

                  <!-- Sale details card -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      📊 Sale Details
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      <strong>Tickets Sold:</strong> ${ticketCount}<br>
                      <strong>Categories:</strong> ${ticketCategories.join(', ')}<br>
                      <strong>Proceeds:</strong> NGN ${proceeds.toFixed(2)}
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Proceeds are credited to your wallet instantly</li>
                      <li>Monitor real-time sales in your dashboard</li>
                      <li>Contact support for any discrepancies</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Organize events and track sales seamlessly</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you are an event organizer on our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketPurchaseAdminTemplate(
  adminName: string,
  event: string,
  ticketCount: number,
  platformCut: number,
  buyerName: string,
  ticketCategories: string[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Platform Transaction Notification - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        New transaction for ${event}! View platform cut and details.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">💸</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      New Transaction, ${adminName}
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      A purchase for <strong style="color: #1e3c72;">${event}</strong> has been completed
                    </p>
                  </div>

                  <!-- Transaction details card -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      📊 Transaction Details
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      <strong>Buyer:</strong> ${buyerName}<br>
                      <strong>Tickets:</strong> ${ticketCount}<br>
                      <strong>Categories:</strong> ${ticketCategories.join(', ')}<br>
                      <strong>Platform Cut:</strong> NGN ${platformCut.toFixed(2)}
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/admin-dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Admin Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Platform cut is credited to the admin wallet</li>
                      <li>Review transaction details in the admin dashboard</li>
                      <li>Contact support for any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Manage events and transactions</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Monitor platform earnings in your wallet
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you are an admin on our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketResaleBuyerTemplate(
  name: string,
  event: string,
  tickets: TicketDetails[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Resale Ticket Purchase Confirmation - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        Your resale tickets for ${event} are confirmed! View your QR codes and details.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">✅</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Your Resale Ticket Purchase, ${name}! 
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      Your purchase of <strong style="color: #1e3c72;">${tickets.length}</strong> resale ticket(s) for <strong style="color: #1e3c72;">${event}</strong> is confirmed
                    </p>
                  </div>

                  <!-- Tickets section -->
                  <h3 style="font-size: 22px; color: #1a1a1a; margin: 0 0 24px 0; font-weight: 600;">
                    🎫 Your Tickets
                  </h3>

                  ${tickets
                    .map(
                      (ticket, index) => `
                        <!-- Ticket card ${index + 1} -->
                        <div style="border: 2px solid #e5e7eb; border-radius: 16px; margin-bottom: 20px; overflow: hidden; position: relative; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);">
                          <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #ff6b6b, #4ecdc4);"></div>
                          <div style="padding: 24px 24px 24px 32px;">
                            <div style="display: table; width: 100%;">
                              <div style="display: table-cell; vertical-align: top; width: 60%;">
                                <h4 style="font-size: 18px; color: #1a1a1a; margin: 0 0 12px 0; font-weight: 600;">
                                  ${ticket.categoryName}
                                </h4>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Ticket ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.ticketId}</code>
                                </p>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Code:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.code}</code>
                                </p>
                                <p style="font-size: 14px; color: #666; margin: 4px 0; line-height: 1.4;">
                                  <strong>Category:</strong> ${ticket.categoryName}
                                </p>
                              </div>
                              <div style="display: table-cell; vertical-align: middle; text-align: center; width: 40%;">
                                <div style="background: #ffffff; padding: 12px; border-radius: 12px; border: 2px solid #e5e7eb; display: inline-block;">
                                  <img src="${ticket.qrCodeDataUrl}" alt="QR Code for Ticket ${ticket.ticketId}" style="width: 120px; height: 120px; border-radius: 8px;" />
                                  <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
                                    Scan at venue
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `,
                    )
                    .join('')}

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Please arrive 30 minutes before the event starts</li>
                      <li>Keep your QR code ready for quick entry</li>
                      <li>Tickets are non-transferable and non-refundable</li>
                      <li>Contact support if you encounter any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Discover events, buy tickets, and resell securely</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you purchased resale tickets through our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketResaleSellerTemplate(
  name: string,
  event: string,
  ticketCount: number,
  proceeds: number,
  ticketCategories: string[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Ticket Resale Confirmation - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        Your tickets for ${event} have been sold! Check your proceeds.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">💸</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Your Ticket Sold, ${name}! 
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      Your <strong style="color: #1e3c72;">${ticketCount}</strong> ticket(s) for <strong style="color: #1e3c72;">${event}</strong> have been sold
                    </p>
                  </div>

                  <!-- Sale details card -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      📊 Sale Details
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      <strong>Tickets Sold:</strong> ${ticketCount}<br>
                      <strong>Categories:</strong> ${ticketCategories.join(', ')}<br>
                      <strong>Proceeds:</strong> NGN ${proceeds.toFixed(2)}
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Proceeds are credited to your wallet instantly</li>
                      <li>Check transaction details in your dashboard</li>
                      <li>Contact support for any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Discover events, buy tickets, and resell securely</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you sold tickets through our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketResaleOrganizerTemplate(
  organizerName: string,
  event: string,
  ticketCount: number,
  royalty: number,
  ticketCategories: string[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Resale Royalty Notification - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        Resale activity for ${event}! Check your royalty earnings.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">💸</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Resale Activity, ${organizerName}
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      <strong style="color: #1e3c72;">${ticketCount}</strong> ticket(s) for <strong style="color: #1e3c72;">${event}</strong> have been resold
                    </p>
                  </div>

                  <!-- Resale details card -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      📊 Resale Details
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      <strong>Tickets Resold:</strong> ${ticketCount}<br>
                      <strong>Categories:</strong> ${ticketCategories.join(', ')}<br>
                      <strong>Royalty:</strong> NGN ${royalty.toFixed(2)}
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Royalties are credited to your wallet instantly</li>
                      <li>Monitor resale activity in your dashboard</li>
                      <li>Contact support for any discrepancies</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Organize events and track sales seamlessly</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you are an event organizer on our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketResaleAdminTemplate(
  adminName: string,
  event: string,
  ticketCount: number,
  platformCut: number,
  buyerName: string,
  sellerName: string,
  ticketCategories: string[],
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Resale Transaction Notification - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        New resale transaction for ${event}! View platform cut and details.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">💸</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      New Resale Transaction, ${adminName}
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      A resale for <strong style="color: #1e3c72;">${event}</strong> has been completed
                    </p>
                  </div>

                  <!-- Transaction details card -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      📊 Transaction Details
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      <strong>Seller:</strong> ${sellerName}<br>
                      <strong>Buyer:</strong> ${buyerName}<br>
                      <strong>Tickets:</strong> ${ticketCount}<br>
                      <strong>Categories:</strong> ${ticketCategories.join(', ')}<br>
                      <strong>Platform Cut:</strong> NGN ${platformCut.toFixed(2)}
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/admin-dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Admin Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Platform cut is credited to the admin wallet</li>
                      <li>Review transaction details in the admin dashboard</li>
                      <li>Contact support for any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Manage events and transactions</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Monitor platform earnings in your wallet
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you are an admin on our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function ticketResaleTemplate(name: string, event: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Ticket Listed for Resale - Ticketer</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; min-height: 100vh;">
      <!-- Preheader text -->
      <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
        Your ticket for ${event} is listed for resale! Manage your listings.
      </div>

      <!-- Main container -->
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto; background-color: transparent;">
        <tr>
          <td style="padding: 40px 20px;">
            
            <!-- Header with logo -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border-radius: 16px 16px 0 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 32px 40px; text-align: center; position: relative;">
                  <div style="position: absolute; top: -5px; left: 20px; width: 10px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
                  <div style="position: absolute; top: 15px; right: 30px; width: 6px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                  <h1 style="font-size: 32px; color: #ffffff; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    🎟️ Ticketer
                  </h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
                    Your trusted ticketing partner
                  </p>
                </td>
              </tr>
            </table>

            <!-- Main content -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">
              <tr>
                <td style="padding: 40px;">
                  
                  <!-- Success message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">🔁</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Ticket Listed, ${name}! 
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      Your ticket for <strong style="color: #1e3c72;">${event}</strong> has been listed for resale
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      📱 View in Dashboard
                    </a>
                    <a href="mailto:support@ticketer.com" style="display: inline-block; background: transparent; color: #667eea; text-decoration: none; padding: 16px 32px; border: 2px solid #667eea; border-radius: 50px; font-size: 16px; font-weight: 600; transition: all 0.3s ease; margin: 0 8px;">
                      📧 Contact Support
                    </a>
                  </div>

                  <!-- Important info -->
                  <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <h4 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                      📋 Important Information
                    </h4>
                    <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>You’ll be notified when your ticket is sold</li>
                      <li>Manage your listings in your dashboard</li>
                      <li>Contact support for any issues</li>
                    </ul>
                  </div>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
              <tr>
                <td style="text-align: center; padding: 24px 20px;">
                  <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 0 0 12px 0; font-weight: 300;">
                    – The Ticketer Team
                  </p>
                  <div style="margin: 20px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">f</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">t</div>
                    </a>
                    <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; text-align: center; line-height: 40px; color: white; font-size: 16px;">@</div>
                    </a>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; backdrop-filter: blur(10px);">
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      🎪 <strong>Discover events, buy tickets, and resell securely</strong> with <a href="https://ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 600;">Ticketer</a>
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      💰 Manage your funds effortlessly with our wallet system
                    </p>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0; font-size: 14px; line-height: 1.5;">
                      ❓ Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #ffffff; text-decoration: underline; font-weight: 500;">support@ticketer.com</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin: 16px 0 0 0; line-height: 1.4;">
                    © 2025 Ticketer. All rights reserved.<br>
                    This email was sent to you because you listed a ticket for resale on our platform.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
