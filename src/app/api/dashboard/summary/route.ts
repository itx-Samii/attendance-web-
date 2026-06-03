import { NextResponse } from 'next/server';
import { readTable, initDatabase } from '@/lib/db';
import { getSession } from '@/lib/authConfig';

interface ClassRecord {
  classId: string;
  name: string;
  schoolId: string;
}

interface StudentRecord {
  rollNumber: string;
  name: string;
  parentPhone: string;
  classId: string;
  schoolId: string;
}

interface AttendanceItem {
  rollNumber: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
}

interface AttendanceRecord {
  classId: string;
  schoolId: string;
  date: string;
  records: AttendanceItem[];
}

interface NotificationRecord {
  schoolId: string;
}

interface SettingsRecord {
  schoolName: string;
}

function fillMissingRates(rates: number[]) {
  const filled = [...rates];
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] === 0) {
      let left = i - 1;
      while (left >= 0 && filled[left] === 0) left -= 1;
      let right = i + 1;
      while (right < filled.length && filled[right] === 0) right += 1;
      if (left >= 0) {
        filled[i] = filled[left];
      } else if (right < filled.length) {
        filled[i] = filled[right];
      } else {
        filled[i] = 100;
      }
    }
  }
  return filled;
}

export async function GET() {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const userRole = session?.role || 'teacher';
    const userClassId = session?.classId || '';

    const [classes, students, attendance, notifications, settings] = await Promise.all([
      readTable<ClassRecord>('classes'),
      readTable<StudentRecord>('students'),
      readTable<AttendanceRecord>('attendance'),
      readTable<NotificationRecord>('notifications'),
      readTable<SettingsRecord>('settings'),
    ]);

    const siteSettings = Array.isArray(settings) ? settings[0] : settings;
    const schoolClasses = classes.filter(
      (c) => (c.schoolId || 'school-aura') === schoolId && (userRole === 'teacher' ? c.classId === userClassId : true)
    );

    const studentCounts: Record<string, number> = {};
    let totalStudents = 0;
    for (const cls of schoolClasses) {
      const count = students.filter(
        (s) => (s.classId || '').toLowerCase() === (cls.classId || '').toLowerCase() && (s.schoolId || 'school-aura') === schoolId
      ).length;
      studentCounts[cls.classId] = count;
      totalStudents += count;
    }

    const today = new Date().toISOString().split('T')[0];
    const classRates: Record<string, number> = {};
    let totalMarked = 0;
    let presentCount = 0;

    for (const cls of schoolClasses) {
      const record = attendance.find(
        (att) =>
          (att.classId || '').toLowerCase() === (cls.classId || '').toLowerCase() &&
          att.date === today &&
          (att.schoolId || 'school-aura') === schoolId
      );
      const records = record?.records || [];
      const present = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
      if (records.length > 0) {
        classRates[cls.classId] = Math.round((present / records.length) * 100);
        totalMarked += records.length;
        presentCount += present;
      } else {
        classRates[cls.classId] = 0;
      }
    }

    const averageRate = totalMarked > 0 ? `${((presentCount / totalMarked) * 100).toFixed(1)}%` : '0%';
    const smsDispatches = notifications.filter((n) => (n.schoolId || 'school-aura') === schoolId).length;

    const trendRates: number[] = [];
    for (let offset = 0; offset < 5; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1) + offset);
      const dateStr = date.toISOString().split('T')[0];
      const dailyRecords = attendance.filter(
        (att) => att.date === dateStr && (att.schoolId || 'school-aura') === schoolId
      );
      let totalDaily = 0;
      let presentDaily = 0;
      dailyRecords.forEach((att) => {
        const records = Array.isArray(att.records) ? att.records : [];
        totalDaily += records.length;
        presentDaily += records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
      });
      trendRates.push(totalDaily > 0 ? parseFloat(((presentDaily / totalDaily) * 100).toFixed(1)) : 0);
    }

    const filledTrendRates = fillMissingRates(trendRates);
    const hasWeeklyData = trendRates.some((rate) => rate > 0);

    return NextResponse.json({
      user: {
        name: session?.name,
        role: userRole,
        classId: userClassId,
      },
      schoolName: siteSettings?.schoolName || 'Aura Attendance',
      classes: schoolClasses,
      studentCounts,
      studentCount: totalStudents,
      classRates,
      averageRate,
      smsDispatches,
      trendRates: filledTrendRates,
      hasWeeklyData,
      redirectUrl: userRole === 'superadmin' ? '/dashboard/super-admin' : undefined,
    });
  } catch (error) {
    console.error('API Error in GET /api/dashboard/summary:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
