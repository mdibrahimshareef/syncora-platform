import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
  }

  try {
    const authContext = await verifyWorkspaceAccess(workspaceId)
    const supabase = (await createClient()) as any
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', authContext.user.id)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
