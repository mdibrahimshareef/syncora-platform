import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMemory,
  getScopedMemories,
  supersedeMemory,
  archiveMemory,
  deleteMemory,
  MemoryValidationError
} from '@/lib/ai/memory';
import { MemoryCategory, MemoryScope } from '@/types/ai-memory';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const category = searchParams.get('category') as MemoryCategory | null;
    const scope = searchParams.get('scope') as MemoryScope | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a workspace member' }, { status: 403 });
    }

    const memories = await getScopedMemories(supabase, workspaceId, {
      userId: user.id,
      categories: category ? [category] : undefined,
      scope: scope || undefined,
      limit
    });

    return NextResponse.json({ success: true, count: memories.length, memories });
  } catch (error: any) {
    console.error('[API /api/ai/memory GET Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      action = 'create',
      workspaceId,
      oldMemoryId,
      scope = 'workspace',
      category,
      content,
      summary,
      attributes,
      sourceType = 'explicit_user',
      sourceEntityType,
      sourceEntityId,
      evidence,
      confidence = 85,
      verificationStatus = 'confirmed',
      expiresAt,
      provenance
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a workspace member' }, { status: 403 });
    }

    if (action === 'supersede') {
      if (!oldMemoryId) {
        return NextResponse.json({ error: 'oldMemoryId is required for supersede action' }, { status: 400 });
      }

      const result = await supersedeMemory(
        supabase,
        workspaceId,
        oldMemoryId,
        {
          workspaceId,
          userId: scope === 'user' ? user.id : null,
          scope,
          category,
          content,
          summary,
          attributes,
          sourceType,
          sourceEntityType,
          sourceEntityId,
          evidence,
          confidence,
          verificationStatus,
          expiresAt,
          provenance
        },
        user.id
      );

      return NextResponse.json({ success: true, ...result });
    }

    const newMemory = await createMemory(
      supabase,
      {
        workspaceId,
        userId: scope === 'user' ? user.id : null,
        scope,
        category,
        content,
        summary,
        attributes,
        sourceType,
        sourceEntityType,
        sourceEntityId,
        evidence,
        confidence,
        verificationStatus,
        expiresAt,
        provenance: {
          ...(provenance || {}),
          creatorRole: membership.role
        }
      },
      user.id
    );

    return NextResponse.json({ success: true, memory: newMemory }, { status: 201 });
  } catch (error: any) {
    if (error instanceof MemoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[API /api/ai/memory POST Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const memoryId = searchParams.get('memoryId');
    const permanent = searchParams.get('permanent') === 'true';

    if (!workspaceId || !memoryId) {
      return NextResponse.json({ error: 'workspaceId and memoryId are required' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden: not a workspace member' }, { status: 403 });
    }

    if (permanent) {
      // Permanent delete requires owner/admin for workspace memories
      const ok = await deleteMemory(supabase, workspaceId, memoryId);
      return NextResponse.json({ success: ok });
    } else {
      const ok = await archiveMemory(supabase, workspaceId, memoryId);
      return NextResponse.json({ success: ok, archived: true });
    }
  } catch (error: any) {
    console.error('[API /api/ai/memory DELETE Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
