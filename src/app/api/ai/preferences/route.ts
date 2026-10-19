import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWorkspaceAccess } from '@/lib/ai/auth';
import {
  getUserAIPreferences,
  updateUserAIPreferences,
  resetUserAIPreferences
} from '@/lib/ai/preferences';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId query parameter is required' }, { status: 400 });
    }

    const { user } = await verifyWorkspaceAccess(workspaceId);
    const supabase = await createClient();

    const preferences = await getUserAIPreferences(supabase, workspaceId, user.id);
    return NextResponse.json({ preferences });
  } catch (error: unknown) {
    console.error('GET /api/ai/preferences error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch preferences';
    if (message.includes('Auth Error') || message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, preferences } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'preferences object is required' }, { status: 400 });
    }

    const { user } = await verifyWorkspaceAccess(workspaceId);
    const supabase = await createClient();

    const updated = await updateUserAIPreferences(supabase, workspaceId, user.id, preferences);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: unknown) {
    console.error('POST /api/ai/preferences error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update preferences';
    if (message.includes('Auth Error') || message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId query parameter is required' }, { status: 400 });
    }

    const { user } = await verifyWorkspaceAccess(workspaceId);
    const supabase = await createClient();

    const reset = await resetUserAIPreferences(supabase, workspaceId, user.id);
    return NextResponse.json({ success: true, preferences: reset });
  } catch (error: unknown) {
    console.error('DELETE /api/ai/preferences error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset preferences';
    if (message.includes('Auth Error') || message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
