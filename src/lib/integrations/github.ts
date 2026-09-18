import { IntegrationProviderAdapter, Integration, IntegrationCredentials, SyncoraEvent } from './types';

export const githubProvider: IntegrationProviderAdapter = {
  name: 'github',
  
  getOAuthAuthorizationUrl: (state: string, redirectUri: string) => {
    const clientId = process.env.GITHUB_CLIENT_ID || '';
    const scopes = ['repo', 'read:user'];
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  exchangeCodeForToken: async (code: string, redirectUri: string) => {
    const clientId = process.env.GITHUB_CLIENT_ID || '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth is not configured on this server.');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth Error: ${data.error_description}`);
    }

    // Fetch user info to get the external account details
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${data.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    const userData = await userRes.json();

    return {
      access_token: data.access_token,
      scopes: data.scope ? data.scope.split(',') : [],
      external_account_id: String(userData.id),
      external_account_name: userData.login,
      metadata: {
        avatar_url: userData.avatar_url,
        url: userData.html_url
      }
    };
  },

  handleOutgoingEvent: async (integration: Integration, credentials: IntegrationCredentials, event: SyncoraEvent) => {
    // Dummy implementation: map Syncora tasks to GitHub Issues, etc.
    console.log(`[GitHub] Event ${event.id} triggered for account ${integration.external_account_name}`);
  }
};
