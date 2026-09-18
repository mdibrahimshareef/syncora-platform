import { NextResponse } from 'next/server';
import { slackProvider } from '@/lib/integrations/slack';
import { githubProvider } from '@/lib/integrations/github';
import { googleCalendarProvider } from '@/lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase/server';

const providers: Record<string, any> = {
  slack: slackProvider,
  github: githubProvider,
  google_calendar: googleCalendarProvider,
};

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await context.params;
  const provider = providers[providerName];
  if (!provider) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const returnTo = url.searchParams.get('returnTo');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
  }

  // Check if user is owner/admin of workspace
  const { data: member, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (error || !member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Unauthorized to configure integrations for this workspace' }, { status: 403 });
  }

  // Create secure OAuth state in the database
  const { data: oauthState, error: stateError } = await (supabase as any)
    .from('oauth_states')
    .insert({
      provider: providerName,
      workspace_id: workspaceId,
      user_id: user.id,
      return_to: returnTo,
      expires_at: new Date(Date.now() + 1000 * 60 * 15).toISOString() // 15 mins expiry
    })
    .select('id')
    .single();

  if (stateError || !oauthState) {
    return NextResponse.json({ error: 'Failed to initialize secure OAuth state' }, { status: 500 });
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host');
  const redirectUri = `${protocol}://${host}/api/oauth/callback/${providerName}`;

  const authUrl = provider.getOAuthAuthorizationUrl(oauthState.id, redirectUri);
  return NextResponse.redirect(authUrl);
}
