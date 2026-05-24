import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

export interface SmsResult {
  success: boolean;
  sid?: string;
  mode: 'Twilio' | 'Simulator';
  error?: string;
}

/**
 * Sends a real parent notification via the Twilio SDK.
 * Fallbacks seamlessly to a console sandbox simulator if environment variables are blank.
 */
export async function sendSmsAlert(to: string, body: string): Promise<SmsResult> {
  // If Twilio keys exist, execute real API dispatches
  if (accountSid && authToken && twilioPhone) {
    try {
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({
        body,
        from: twilioPhone,
        to,
      });
      return {
        success: true,
        sid: message.sid,
        mode: 'Twilio',
      };
    } catch (error: any) {
      console.error('Twilio SDK Dispatch Failed:', error);
      return {
        success: false,
        mode: 'Twilio',
        error: error?.message || 'Twilio SDK error',
      };
    }
  }

  // Fallback visual Console sandbox simulator mode (D-03, D-04)
  const mockSid = 'SM' + Math.random().toString(36).substring(2, 11).toUpperCase();
  
  console.log('\n==================================================');
  console.log('          🔔 AURA ATTENDANCE ERP SIMULATOR       ');
  console.log('==================================================');
  console.log(`[Status]   MOCK SANDBOX DISPATCH LOGGED`);
  console.log(`[Target]   Parent Contact: ${to}`);
  console.log(`[Mock SID] ${mockSid}`);
  console.log(`[Message]  "${body}"`);
  console.log('==================================================\n');

  return {
    success: true,
    sid: mockSid,
    mode: 'Simulator',
  };
}
