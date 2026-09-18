export type IntegrationProviderName = 'slack' | 'github' | 'jira' | 'google_calendar';

export interface Integration {
  id: string;
  workspace_id: string;
  provider: IntegrationProviderName;
  name: string;
  status: 'connected' | 'error' | 'disconnected';
  auth_type: 'oauth2' | 'token';
  external_account_id?: string;
  external_account_name?: string;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_connected_at?: string;
  last_error_at?: string;
  last_error?: string;
  disconnected_at?: string;
}

export interface IntegrationCredentials {
  id: string;
  integration_id: string;
  access_token: string;
  refresh_token?: string;
  scopes: string[];
  token_expires_at?: string;
}

export interface WebhookEndpoint {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  secret: string; // Only provided on creation
  status: 'active' | 'disabled' | 'failing';
  subscribed_events: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_delivery_at?: string;
  last_success_at?: string;
  last_failure_at?: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  workspace_id: string;
  event_id: string;
  event_type: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt_count: number;
  response_status?: number;
  response_time?: number;
  error?: string;
  payload: any;
  created_at: string;
  delivered_at?: string;
  next_retry_at?: string;
}

export interface SyncoraEvent {
  id: string;
  type: string;
  workspaceId: string;
  actorId?: string;
  createdAt: string;
  payload: Record<string, any>;
}

export interface IntegrationProviderAdapter {
  name: IntegrationProviderName;
  getOAuthAuthorizationUrl: (state: string, redirectUri: string) => string;
  exchangeCodeForToken: (code: string, redirectUri: string) => Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scopes: string[];
    external_account_id?: string;
    external_account_name?: string;
    metadata?: Record<string, any>;
  }>;
  handleOutgoingEvent: (integration: Integration, credentials: IntegrationCredentials, event: SyncoraEvent) => Promise<void>;
  verifyWebhookSignature?: (req: Request, rawBody: string) => Promise<boolean>;
}
