export function loginTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Login Notification - Ticketer</title>
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
        You just logged into your Ticketer account, ${name}. Verify this was you.
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
                  
                  <!-- Login message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%); padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                      <span style="font-size: 24px;">👋</span>
                    </div>
                    <h2 style="font-size: 28px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2;">
                      Hello again, ${name}!
                    </h2>
                    <p style="font-size: 18px; color: #666666; margin: 0; font-weight: 400;">
                      You just logged into your <strong style="color: #1e3c72;">Ticketer</strong> account
                    </p>
                  </div>

                  <!-- Security notice -->
                  <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f0fe 100%); border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; margin-bottom: 32px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(30,60,114,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
                    <h3 style="font-size: 20px; color: #1e3c72; margin: 0 0 16px 0; font-weight: 600;">
                      🔒 Account Security
                    </h3>
                    <p style="font-size: 16px; color: #555; margin: 8px 0; line-height: 1.5;">
                      If this wasn’t you, take action to secure your account immediately.
                    </p>
                  </div>

                  <!-- Action buttons -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://ticketer.com/reset-password" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease; margin: 0 8px;">
                      🔐 Reset Password
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
                      <li>Check your login activity in your dashboard</li>
                      <li>Reset your password if you suspect unauthorized access</li>
                      <li>Contact support immediately if this login wasn’t you</li>
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
                    This email was sent to you because you logged into your account.
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
