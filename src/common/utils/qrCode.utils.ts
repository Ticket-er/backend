import QRCode from 'qrcode';

// Define the QRTicketData interface
export interface QRTicketData {
  ticketId: string;
  eventId: string;
  userId: string;
  code: string;
  verificationCode: string;
  timestamp: number;
}

export const generateTicketQRBuffer = (
  ticketData: QRTicketData,
): Promise<Buffer> => {
  const baseUrl = process.env.FRONTEND_URL || 'https://ticketer.com';
  const verificationUrl = `${baseUrl}/verify-ticket?data=${encodeURIComponent(
    JSON.stringify(ticketData),
  )}`;

  return QRCode.toBuffer(verificationUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
};

// Parse ticket data from verification URL
export const parseTicketData = (dataString: string): QRTicketData | null => {
  try {
    const data = JSON.parse(decodeURIComponent(dataString));

    // Validate required fields
    if (
      !data.ticketId ||
      !data.eventId ||
      !data.userId ||
      !data.verificationCode
    ) {
      return null;
    }

    return data as QRTicketData;
  } catch (error) {
    console.error('Error parsing ticket data:', error);
    return null;
  }
};

// Generate verification code
export const generateVerificationCode = (
  code: string,
  eventId: string,
  userId: string,
): string => {
  const combined = `${code}-${eventId}-${userId}-${Date.now()}`;
  return btoa(combined)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 12)
    .toUpperCase();
};
