import { IntegrationProviderAdapter, Integration, IntegrationCredentials, SyncoraEvent } from './types';

export const slackProvider: IntegrationProviderAdapter = {
  name: 'slack',
  
  getOAuthAuthorizationUrl: (state: string, redirectUri: string) => {
    const clientId = process.env.SLACK_CLIENT_ID || '';
    const scopes = ['chat:write', 'channels:read', 'groups:read'];
    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  exchangeCodeForToken: async (code: string, redirectUri: string) => {
    const clientId = process.env.SLACK_CLIENT_ID || '';
    const clientSecret = process.env.SLACK_CLIENT_SECRET || '';
    
    // Check if env variables are missing to fail gracefully
    if (!clientId || !clientSecret) {
      throw new Error('Slack OAuth is not configured on this server.');
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack OAuth Error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      scopes: data.scope.split(','),
      external_account_id: data.team?.id,
      external_account_name: data.team?.name,
      metadata: {
        bot_user_id: data.bot_user_id,
        authed_user: data.authed_user,
      }
    };
  },

  handleOutgoingEvent: async (integration: Integration, credentials: IntegrationCredentials, event: SyncoraEvent) => {
    // In a real app, this would format the event into a Slack message and post it
    // using the access_token.
    console.log(`[Slack] Forwarding event ${event.id} (${event.type}) to team ${integration.external_account_name}`);
    
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: integration.metadata?.default_channel || '#general', // Example
        text: `New Event: ${event.type}\nWorkspace: ${event.workspaceId}`,
      })
    });
    
    const result = await response.json();
    if (!result.ok) {
      console.error('[Slack] Failed to send message', result.error);
    }
  }
};
