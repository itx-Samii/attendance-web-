import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/authConfig';
import { readTable, writeTable } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access Denied. Super Admin privilege required.' }, { status: 403 });
    }

    const schools = await readTable<any>('schools');
    return NextResponse.json(schools);
  } catch (error: any) {
    console.error('Failed to list schools:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const body = await req.json();
    const { schoolName, principalName, principalEmail, password } = body;

    if (!schoolName || !principalName || !principalEmail || !password) {
      return NextResponse.json({ error: 'All fields (schoolName, principalName, principalEmail, password) are required.' }, { status: 400 });
    }

    const users = await readTable<any>('users');
    if (users.some((u) => u.email.toLowerCase() === principalEmail.toLowerCase())) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    const schoolId = 'school-' + Math.random().toString(36).substring(2, 9);

    const newSchool = {
      schoolId,
      schoolName: schoolName.trim(),
      principalEmail: principalEmail.trim().toLowerCase(),
      status: 'active',
      createdAt: new Date().toISOString(),
      useSimulator: true,
      whatsappEnabled: false,
      smsTemplate: 'Dear Parent, your child {name} (Roll: {roll}) was marked Absent from class {class} on {date}. Please contact the school office.',
      licenseKey: 'AURA-ACTIVE-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      licenseStatus: 'Active',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year expiry
      licenseLimitClasses: 25,
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

    return NextResponse.json({ success: true, school: newSchool });
  } catch (error: any) {
    console.error('Failed to create school:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const body = await req.json();
    const { schoolId, status, licenseKey, licenseStatus, licenseExpiry, licenseLimitClasses, principalPassword } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }

    const schools = await readTable<any>('schools');
    const idx = schools.findIndex((s) => s.schoolId === schoolId);
    if (idx === -1) {
      return NextResponse.json({ error: 'School not found.' }, { status: 404 });
    }

    const school = schools[idx];
    if (status) school.status = status;
    if (licenseKey) school.licenseKey = licenseKey.trim();
    if (licenseStatus) school.licenseStatus = licenseStatus;
    if (licenseExpiry) school.licenseExpiry = licenseExpiry;
    if (licenseLimitClasses !== undefined) school.licenseLimitClasses = Number(licenseLimitClasses);

    // If status changed to suspended, also update license status to suspended for consistency
    if (status === 'suspended') {
      school.licenseStatus = 'Suspended';
    } else if (status === 'active' && school.licenseStatus === 'Suspended') {
      school.licenseStatus = 'Active';
    }

    // Update school principal password if provided
    if (principalPassword !== undefined && principalPassword.trim() !== '') {
      const users = await readTable<any>('users');
      const uIdx = users.findIndex(
        (u) => u.email.toLowerCase() === school.principalEmail.toLowerCase()
      );
      if (uIdx !== -1) {
        users[uIdx].password = principalPassword.trim();
        await writeTable('users', users);
      }
    }

    await writeTable('schools', schools);
    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    console.error('Failed to update school:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
