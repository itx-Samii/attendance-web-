import { NextRequest, NextResponse } from 'next/server';
import { getSession, initUsers, StaffUser } from '@/lib/authConfig';
import { readTable, writeTable } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    // Only allow admin role to manage or view other active user directory listings
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied. Admin privilege required.' }, { status: 403 });
    }

    await initUsers();
    const users = await readTable<StaffUser>('users');
    
    // Filter users strictly by current schoolId
    const filtered = users.filter((u) => (u.schoolId || 'school-aura') === (session.schoolId || 'school-aura'));

    // Sanitize passwords for transfer security
    const sanitized = filtered.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      classId: u.classId || '',
      schoolId: u.schoolId || '',
    }));

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('Failed to list user directories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const { email, password, name, role, classId } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'All fields (email, password, name, role) are required.' }, { status: 400 });
    }

    await initUsers();
    const users = await readTable<StaffUser>('users');

    // Email addresses must be unique platform-wide
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    const newUser: StaffUser = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
      name: name.trim(),
      role: role === 'admin' ? 'admin' : 'teacher',
      classId: role === 'teacher' ? (classId || '') : undefined,
      schoolId: session.schoolId || '',
    };

    const updated = [...users, newUser];
    await writeTable('users', updated);

    return NextResponse.json({ success: true, user: { email: newUser.email, name: newUser.name, role: newUser.role, classId: newUser.classId, schoolId: newUser.schoolId } });
  } catch (error: any) {
    console.error('Failed to register user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const { email, name, role, password, classId } = await req.json();

    if (!email || !name || !role) {
      return NextResponse.json({ error: 'Email, name, and role are required parameters.' }, { status: 400 });
    }

    await initUsers();
    const users = await readTable<StaffUser>('users');
    
    // Find index of staff strictly within the admin's school
    const index = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase() && (u.schoolId || 'school-aura') === (session.schoolId || 'school-aura'));

    if (index === -1) {
      return NextResponse.json({ error: 'Staff account record not found in your school.' }, { status: 404 });
    }

    // Update fields
    const current = users[index];
    users[index] = {
      email: current.email,
      name: name.trim(),
      role: role === 'admin' ? 'admin' : 'teacher',
      password: password ? password.trim() : current.password,
      classId: role === 'teacher' ? (classId || '') : undefined,
      schoolId: current.schoolId,
    };

    await writeTable('users', users);
    return NextResponse.json({ success: true, user: { email: users[index].email, name: users[index].name, role: users[index].role, classId: users[index].classId, schoolId: users[index].schoolId } });
  } catch (error: any) {
    console.error('Failed to update staff details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Target email is required.' }, { status: 400 });
    }

    // Restrict self-deletion (must not lock out oneself)
    if (session.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json({ error: 'Security Lock. You cannot delete your own logged-in admin account.' }, { status: 400 });
    }

    await initUsers();
    const users = await readTable<StaffUser>('users');
    
    // Check if user belongs to this school
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase() && (u.schoolId || 'school-aura') === (session.schoolId || 'school-aura'));
    if (!exists) {
      return NextResponse.json({ error: 'Target staff account not found in your school.' }, { status: 404 });
    }

    const filtered = users.filter((u) => !(u.email.toLowerCase() === email.toLowerCase() && (u.schoolId || 'school-aura') === (session.schoolId || 'school-aura')));
    await writeTable('users', filtered);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete staff record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
