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
      <title>Ticket Purchase Confirmation - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Thanks for your purchase, ${name}! 🎟️</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your ticket(s) for <strong>${event}</strong> are confirmed. Below are your ticket details:</p>
            ${tickets
              .map(
                (ticket) => `
                  <div style="margin-top: 20px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Ticket ID: ${ticket.ticketId}</p>
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Code: ${ticket.code}</p>
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Category: ${ticket.categoryName}</p>
                    <img src="${ticket.qrCodeDataUrl}" alt="QR Code for Ticket ${ticket.ticketId}" style="display: block; margin: 10px auto; width: 150px; height: 150px;" />
                  </div>
                `,
              )
              .join('')}
            <p style="font-size: 16px; color: #666666; margin-top: 20px;">View your tickets and event details in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
      <title>Ticket Sale Notification - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">New Ticket Sale, ${organizerName}! 🎉</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Great news! <strong>${ticketCount}</strong> ticket(s) for your event <strong>${event}</strong> have been sold in the following categories: <strong>${ticketCategories.join(', ')}</strong>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Proceeds of <strong>NGN ${proceeds.toFixed(2)}</strong> have been credited to your <a href="https://ticketer.com/dashboard/wallet" style="color: #1a73e8; text-decoration: underline;">wallet</a>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Track your ticket sales and manage your event in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
            <p style="margin: 5px 0;">Organize events and track sales seamlessly with <a href="https://ticketer.com" style="color: #1a73e8; text-decoration: underline;">Ticketer</a>.</p>
            <p style="margin: 5px 0;">Manage your funds effortlessly with our wallet system.</p>
            <p style="margin: 5px 0;">Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support@ticketer.com</a>.</p>
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
      <title>Platform Transaction Notification - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">New Transaction, ${adminName}</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">A purchase of <strong>${ticketCount}</strong> ticket(s) for <strong>${event}</strong> by <strong>${buyerName}</strong> has been completed in the following categories: <strong>${ticketCategories.join(', ')}</strong>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Platform cut of <strong>NGN ${platformCut.toFixed(2)}</strong> has been credited to the admin <a href="https://ticketer.com/dashboard/wallet" style="color: #1a73e8; text-decoration: underline;">wallet</a>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">View transaction details in your <a href="https://ticketer.com/admin-dashboard" style="color: #1a73e8; text-decoration: underline;">admin dashboard</a>.</p>
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
            <p style="margin: 5px 0;">Manage events and transactions with <a href="https://ticketer.com" style="color: #1a73e8; text-decoration: underline;">Ticketer</a>.</p>
            <p style="margin: 5px 0;">Monitor platform earnings in your wallet.</p>
            <p style="margin: 5px 0;">Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support@ticketer.com</a>.</p>
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
      <title>Resale Ticket Purchase Confirmation - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Your Resale Ticket Purchase, ${name}! 🎟️</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your purchase of <strong>${tickets.length}</strong> resale ticket(s) for <strong>${event}</strong> is confirmed. Below are your ticket details:</p>
            ${tickets
              .map(
                (ticket) => `
                  <div style="margin-top: 20px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Ticket ID: ${ticket.ticketId}</p>
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Code: ${ticket.code}</p>
                    <p style="font-size: 16px; color: #666666; margin: 5px 0;">Category: ${ticket.categoryName}</p>
                    <img src="${ticket.qrCodeDataUrl}" alt="QR Code for Ticket ${ticket.ticketId}" style="display: block; margin: 10px auto; width: 150px; height: 150px;" />
                  </div>
                `,
              )
              .join('')}
            <p style="font-size: 16px; color: #666666; margin-top: 20px;">View your tickets and event details in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
      <title>Ticket Resale Confirmation - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Your Ticket Sold, ${name}! 💸</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your <strong>${ticketCount}</strong> ticket(s) for <strong>${event}</strong> in the following categories: <strong>${ticketCategories.join(', ')}</strong> have been successfully sold on the resale market.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Proceeds of <strong>NGN ${proceeds.toFixed(2)}</strong> have been sent to your designated account. Check your <a href="https://ticketer.com/dashboard/wallet" style="color: #1a73e8; text-decoration: underline;">wallet</a> for transaction details.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">List more tickets or explore events in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
      <title>Resale Royalty Notification - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Resale Activity, ${organizerName}</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;"><strong>${ticketCount}</strong> ticket(s) for your event <strong>${event}</strong> in the following categories: <strong>${ticketCategories.join(', ')}</strong> have been resold.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">A royalty of <strong>NGN ${royalty.toFixed(2)}</strong> has been credited to your <a href="https://ticketer.com/dashboard/wallet" style="color: #1a73e8; text-decoration: underline;">wallet</a>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Monitor resale activity in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
            <p style="margin: 5px 0;">Organize events and track sales seamlessly with <a href="https://ticketer.com" style="color: #1a73e8; text-decoration: underline;">Ticketer</a>.</p>
            <p style="margin: 5px 0;">Manage your funds effortlessly with our wallet system.</p>
            <p style="margin: 5px 0;">Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support@ticketer.com</a>.</p>
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
      <title>Resale Transaction Notification - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">New Resale Transaction, ${adminName}</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">A resale of <strong>${ticketCount}</strong> ticket(s) for <strong>${event}</strong> in the following categories: <strong>${ticketCategories.join(', ')}</strong> from <strong>${sellerName}</strong> to <strong>${buyerName}</strong> has been completed.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Platform cut of <strong>NGN ${platformCut.toFixed(2)}</strong> has been credited to the admin <a href="https://ticketer.com/dashboard/wallet" style="color: #1a73e8; text-decoration: underline;">wallet</a>.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">View transaction details in your <a href="https://ticketer.com/admin-dashboard" style="color: #1a73e8; text-decoration: underline;">admin dashboard</a>.</p>
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
            <p style="margin: 5px 0;">Manage events and transactions with <a href="https://ticketer.com" style="color: #1a73e8; text-decoration: underline;">Ticketer</a>.</p>
            <p style="margin: 5px 0;">Monitor platform earnings in your wallet.</p>
            <p style="margin: 5px 0;">Questions? Reach us at <a href="mailto:support@ticketer.com" style="color: #1a73e8; text-decoration: underline;">support@ticketer.com</a>.</p>
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
      <title>Ticket Listed for Resale - Ticketer</title>
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
            <h2 style="font-size: 20px; color: #333333; margin-top: 20px;">Ticket Listed, ${name}! 🔁</h2>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">Your ticket for <strong>${event}</strong> has been successfully listed for resale.</p>
            <p style="font-size: 16px; color: #666666; margin-top: 10px;">You’ll be notified when it’s sold. Manage your listings in your <a href="https://ticketer.com/dashboard" style="color: #1a73e8; text-decoration: underline;">dashboard</a>.</p>
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
