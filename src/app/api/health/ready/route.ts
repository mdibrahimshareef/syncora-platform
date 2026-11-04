import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 5000;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    logger.warn({
      operation: 'health_check_ready',
      message: 'Database readiness check failed: missing Supabase environment variables',
      status: 'error',
      errorCategory: 'CONFIG_ERROR',
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'syncora-core',
        checks: {
          database: 'unconfigured',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const clientKey = serviceRoleKey || anonKey!;
  const supabase = createSupabaseClient(supabaseUrl, clientKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const checkPromise = supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Database probe timed out')), DB_TIMEOUT_MS)
    );

    const result = await Promise.race([checkPromise, timeoutPromise]);

    if ('error' in result && result.error) {
      throw result.error;
    }

    return NextResponse.json(
      {
        status: 'ready',
        service: 'syncora-core',
        checks: {
          database: 'connected',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      operation: 'health_check_ready',
      message: 'Database readiness probe failed',
      status: 'error',
      errorCategory: 'DATABASE_UNREACHABLE',
      metadata: {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      },
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'syncora-core',
        checks: {
          database: 'unreachable',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
