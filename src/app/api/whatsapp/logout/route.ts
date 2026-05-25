import { NextResponse } from 'next/server';
import { logoutWhatsApp } from '@/lib/whatsapp';
import { getSession } from '@/lib/authConfig';

/**
 * POST /api/whatsapp/logout
 *
 * Destroys the current WhatsApp Web session for the active school and clears locally
 * saved auth data, forcing a fresh QR scan on the next connection.
 *
 * Used by the "Disconnect" button on the Settings → Gateway page.
 */
export async function POST() {
  try {
    const session = await getSession();
    const schoolId = session?.schoolId || 'school-aura';

    await logoutWhatsApp(schoolId);
    return NextResponse.json({ success: true, message: 'WhatsApp session disconnected. Rescan the QR code to reconnect.' });
  } catch (err: any) {
    console.error('[WhatsApp Logout API] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to logout WhatsApp session.' },
      { status: 500 }
    );
  }
}
