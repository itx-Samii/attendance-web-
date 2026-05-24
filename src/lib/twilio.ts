import twilio from 'twilio';
import { readTable } from './db';

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
  let activeSid = process.env.TWILIO_ACCOUNT_SID || '';
  let activeToken = process.env.TWILIO_AUTH_TOKEN || '';
  let activePhone = process.env.TWILIO_PHONE_NUMBER || '';
  let simulator = true;

  try {
    const settingsArr = await readTable<any>('settings');
    if (settingsArr.length > 0) {
      const s = settingsArr[0];
      activeSid = s.twilioAccountSid || activeSid;
      activeToken = s.twilioAuthToken || activeToken;
      activePhone = s.twilioPhoneNumber || activePhone;
      simulator = s.useSimulator !== undefined ? s.useSimulator : simulator;
    } else {
      simulator = !activeSid;
    }
  } catch (err) {
    console.error('Failed to load dynamic database settings in Twilio service:', err);
    simulator = !activeSid;
  }

  if (!simulator && activeSid && activeToken && activePhone) {
    try {
      const client = twilio(activeSid, activeToken);
      const message = await client.messages.create({
        body,
        from: activePhone,
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
