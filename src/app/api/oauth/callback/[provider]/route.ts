import { NextResponse } from 'next/server';
import { slackProvider } from '@/lib/integrations/slack';
import { githubProvider } from '@/lib/integrations/github';
import { googleCalendarProvider } from '@/lib/integrations/google-calendar';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/integrations/crypto';

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

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return NextResponse.json({ error: `OAuth Error: ${errorParam}` }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Verify OAuth State from Database
  const { data: oauthState, error: stateError } = await (supabase as any)
    .from('oauth_states')
    .select('*')
    .eq('id', state)
    .single();

  if (stateError || !oauthState) {
    return NextResponse.json({ error: 'Invalid or missing state' }, { status: 400 });
  }

  if (oauthState.provider !== providerName) {
    return NextResponse.json({ error: 'State provider mismatch' }, { status: 400 });
  }

  if (new Date(oauthState.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'State expired' }, { status: 400 });
  }

  if (oauthState.user_id !== user.id) {
    return NextResponse.json({ error: 'State user mismatch' }, { status: 403 });
  }

  const workspaceId = oauthState.workspace_id;
  const returnTo = oauthState.return_to;

  // Cleanup used state
  await (supabase as any).from('oauth_states').delete().eq('id', state);

  // Verify permissions again just in case
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Unauthorized for this workspace' }, { status: 403 });
  }

  try {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const redirectUri = `${protocol}://${host}/api/oauth/callback/${providerName}`;

    const tokenData = await provider.exchangeCodeForToken(code, redirectUri);

    // 2. Upsert Integration Record (Metadata)
    const { data: integration, error: upsertError } = await (supabase as any)
      .from('integrations')
      .upsert(
        {
          workspace_id: workspaceId,
          provider: providerName,
          name: providerName,
          status: 'connected',
          auth_type: 'oauth2',
          external_account_id: tokenData.external_account_id,
          external_account_name: tokenData.external_account_name,
          metadata: tokenData.metadata,
          created_by: user.id,
          last_connected_at: new Date().toISOString()
        },
        { onConflict: 'workspace_id, provider' }
      )
      .select('id')
      .single();

    if (upsertError || !integration) {
      throw new Error(`Failed to save integration record: ${upsertError?.message}`);
    }

    // 3. Encrypt and Save Credentials
    const encryptedAccessToken = tokenData.access_token ? encryptToken(tokenData.access_token) : null;
    const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

    const { error: credError } = await (supabase as any)
      .from('integration_credentials')
      .upsert(
        {
          integration_id: integration.id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          scopes: tokenData.scopes,
          token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        },
        { onConflict: 'integration_id' }
      );

    if (credError) {
      console.error('Failed to save credentials:', credError);
    }

    if (returnTo) {
      return NextResponse.redirect(new URL(returnTo, request.url));
    }
    
    return NextResponse.json({ success: true, message: 'Integration connected successfully.' });
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
