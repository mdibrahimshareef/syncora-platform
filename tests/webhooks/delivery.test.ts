import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processWebhookDelivery } from '@/lib/webhooks/delivery';
import * as serverModule from '@/lib/supabase/server';

describe('Phase 4: Outbound Webhook Delivery, SSRF & Redirect Hardening', () => {
  let mockAdminClient: any;
  let mockUpdateDeliveries: any;
  let mockUpdateEndpoints: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockUpdateDeliveries = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });

    mockUpdateEndpoints = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });

    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'webhook_deliveries') {
          return {
            select: vi.fn(),
            update: mockUpdateDeliveries,
          };
        }
        if (table === 'webhook_endpoints') {
          return {
            update: mockUpdateEndpoints,
          };
        }
        return {};
      }),
    };

    vi.spyOn(serverModule, 'createAdminClient').mockReturnValue(mockAdminClient as any);
  });

  it('immediately blocks delivery to SSRF target without network fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'del-ssrf',
        workspace_id: 'ws-1',
        endpoint_id: 'ep-1',
        webhook_endpoints: {
          id: 'ep-1',
          url: 'http://169.254.169.254/latest/meta-data',
          secret: 'secret-123',
          status: 'active',
        },
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdateDeliveries,
    });

    const event: any = { id: 'evt-1', type: 'task.updated', workspaceId: 'ws-1', payload: {} };

    await processWebhookDelivery('del-ssrf', event, 1);

    // Network fetch must NEVER be invoked
    expect(fetchSpy).not.toHaveBeenCalled();

    // Delivery marked failed with SSRF reason
    expect(mockUpdateDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('SSRF Blocked'),
      })
    );
  });

  it('blocks delivery redirecting to an internal SSRF target (redirect interception)', async () => {
    // 1. Initial fetch returns 302 redirect pointing to internal metadata IP
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      status: 302,
      headers: new Headers({
        location: 'http://169.254.169.254/latest/meta-data',
      }),
    } as any);

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'del-redirect-ssrf',
        workspace_id: 'ws-1',
        endpoint_id: 'ep-1',
        webhook_endpoints: {
          id: 'ep-1',
          url: 'https://public-service.example.com/webhook',
          secret: 'secret-123',
          status: 'active',
        },
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdateDeliveries,
    });

    const event: any = { id: 'evt-1', type: 'task.updated', workspaceId: 'ws-1', payload: {} };

    await processWebhookDelivery('del-redirect-ssrf', event, 1);

    // Delivery must be failed due to SSRF blocked on redirect hop
    expect(mockUpdateDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('SSRF Blocked on redirect'),
      })
    );
  });

  it('marks delivery as dead_letter on reaching max retry attempts (3)', async () => {
    // Mock fetch returning HTTP 500
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    } as any);

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'del-dlq',
        workspace_id: 'ws-1',
        endpoint_id: 'ep-1',
        webhook_endpoints: {
          id: 'ep-1',
          url: 'https://webhook.site/my-endpoint',
          secret: 'secret-123',
          status: 'active',
        },
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdateDeliveries,
    });

    const event: any = { id: 'evt-1', type: 'task.updated', workspaceId: 'ws-1', payload: {} };

    // Attempt 3 is maxAttempts
    await processWebhookDelivery('del-dlq', event, 3);

    // Final update must classify as dead_letter
    expect(mockUpdateDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'dead_letter',
        attempt_count: 3,
        response_status: 500,
      })
    );
  });

  it('marks delivery as delivered on successful HTTP 200', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    } as any);

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'del-success',
        workspace_id: 'ws-1',
        endpoint_id: 'ep-1',
        webhook_endpoints: {
          id: 'ep-1',
          url: 'https://webhook.site/my-endpoint',
          secret: 'secret-123',
          status: 'active',
        },
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdateDeliveries,
    });

    const event: any = { id: 'evt-1', type: 'task.updated', workspaceId: 'ws-1', payload: {} };

    await processWebhookDelivery('del-success', event, 1);

    expect(mockUpdateDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'delivered',
        attempt_count: 1,
        response_status: 200,
      })
    );
  });
});
