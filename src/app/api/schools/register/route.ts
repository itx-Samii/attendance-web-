import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolName, principalName, principalEmail, password } = body;

    if (!schoolName || !principalName || !principalEmail || !password) {
      return NextResponse.json({ error: 'All fields (schoolName, principalName, principalEmail, password) are required.' }, { status: 400 });
    }

    const users = await readTable<any>('users');
    if (users.some((u) => u.email.toLowerCase() === principalEmail.toLowerCase())) {
      return NextResponse.json({ error: 'An account with this principal email address already exists.' }, { status: 400 });
    }

    const schoolId = 'school-' + Math.random().toString(36).substring(2, 9);

    const newSchool = {
      schoolId,
      schoolName: schoolName.trim(),
      principalEmail: principalEmail.trim().toLowerCase(),
      status: 'pending', // Starts pending Super Admin allow/approval!
      createdAt: new Date().toISOString(),
      useSimulator: true,
      whatsappEnabled: false,
      smsTemplate: 'Dear Parent, your child {name} (Roll: {roll}) was marked Absent from class {class} on {date}. Please contact the school office.',
      licenseKey: 'AURA-TRIAL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      licenseStatus: 'Trial',
      licenseExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14-day trial
      licenseLimitClasses: 10,
    };

    const newPrincipal = {
      email: principalEmail.trim().toLowerCase(),
      password: password.trim(),
      name: principalName.trim(),
      role: 'admin',
      schoolId,
    };

    const schools = await readTable<any>('schools');
    await writeTable('schools', [...schools, newSchool]);
    await writeTable('users', [...users, newPrincipal]);

    return NextResponse.json({ success: true, message: 'Application submitted successfully. Waiting for Super Admin approval.' });
  } catch (error: any) {
    console.error('Failed to submit school application:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
