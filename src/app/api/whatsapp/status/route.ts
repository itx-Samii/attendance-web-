import { NextResponse } from 'next/server';
import { getWhatsAppStatus, initWhatsAppClient } from '@/lib/whatsapp';
import { getSession } from '@/lib/authConfig';

/**
 * GET /api/whatsapp/status
 *
 * Returns the current WhatsApp connection state, scoped by schoolId from user session.
 * The settings page polls this endpoint every 3 seconds to update
 * the QR code display and connection badge.
 */
export async function GET() {
  try {
    const session = await getSession();
    const schoolId = session?.schoolId || 'school-aura';

    // Kick off init if not yet started (idempotent)
    initWhatsAppClient(schoolId).catch(() => {});

    const state = getWhatsAppStatus(schoolId);
    return NextResponse.json(state);
  } catch (err: any) {
    console.error('[WhatsApp Status API] Error:', err);
    return NextResponse.json(
      { status: 'disconnected', error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
