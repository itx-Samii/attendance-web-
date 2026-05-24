import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';

export interface SystemSettings {
  schoolName: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  useSimulator: boolean;
  smsTemplate: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'Aura Attendance ERP',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioPhoneNumber: '',
  useSimulator: true,
  smsTemplate: 'Dear Parent, your child {name} (Roll: {roll}) was marked Absent from class {class} on {date}. Please contact the school office.',
};

export async function GET() {
  try {
    await initDatabase();
    const settingsArr = await readTable<SystemSettings>('settings');
    
    if (settingsArr.length === 0) {
      // Seed default configurations
      const initialSettings: SystemSettings = {
        ...DEFAULT_SETTINGS,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        useSimulator: !process.env.TWILIO_ACCOUNT_SID,
      };
      await writeTable('settings', [initialSettings]);
      return NextResponse.json(initialSettings);
    }
    
    return NextResponse.json(settingsArr[0]);
  } catch (error: any) {
    console.error('API Error in GET /api/settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    
    const settingsArr = await readTable<SystemSettings>('settings');
    const current = settingsArr.length > 0 ? settingsArr[0] : DEFAULT_SETTINGS;
    
    const updatedSettings: SystemSettings = {
      schoolName: (body.schoolName || current.schoolName).trim(),
      twilioAccountSid: (body.twilioAccountSid !== undefined ? body.twilioAccountSid : current.twilioAccountSid).trim(),
      twilioAuthToken: (body.twilioAuthToken !== undefined ? body.twilioAuthToken : current.twilioAuthToken).trim(),
      twilioPhoneNumber: (body.twilioPhoneNumber !== undefined ? body.twilioPhoneNumber : current.twilioPhoneNumber).trim(),
      useSimulator: body.useSimulator !== undefined ? body.useSimulator : current.useSimulator,
      smsTemplate: (body.smsTemplate || current.smsTemplate).trim(),
    };
    
    await writeTable('settings', [updatedSettings]);
    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error('API Error in POST /api/settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save system settings' },
      { status: 500 }
    );
  }
}
