import { IntegrationProviderAdapter, Integration, IntegrationCredentials, SyncoraEvent } from './types';

export const googleCalendarProvider: IntegrationProviderAdapter = {
  name: 'google_calendar',
  
  getOAuthAuthorizationUrl: (state: string, redirectUri: string) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const scopes = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.profile'];
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent&state=${state}`;
  },

  exchangeCodeForToken: async (code: string, redirectUri: string) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth is not configured on this server.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`Google OAuth Error: ${data.error_description || data.error}`);
    }

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });
    const userData = await userRes.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scopes: data.scope ? data.scope.split(' ') : [],
      external_account_id: userData.id,
      external_account_name: userData.name || userData.email,
      metadata: {
        email: userData.email,
        picture: userData.picture
      }
    };
  },

  handleOutgoingEvent: async (integration: Integration, credentials: IntegrationCredentials, event: SyncoraEvent) => {
    console.log(`[Google Calendar] Event ${event.id} triggered for account ${integration.external_account_name}`);
  }
};
