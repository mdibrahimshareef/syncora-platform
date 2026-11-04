import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness Probe: Answers "Is the application process running?"
 * Lightweight, fast, zero external dependencies.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'syncora-core',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
