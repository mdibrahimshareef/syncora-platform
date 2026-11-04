import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordInboundWebhookEvent } from '@/lib/webhooks/inbound-idempotency';
import { dispatchEvent } from '@/lib/events/dispatcher';
import * as serverModule from '@/lib/supabase/server';

describe('Phase 3: Webhook Idempotency & Dispatch Reliability (Finding 15.1 & 15.3)', () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockAdminClient = {
      from: vi.fn(),
    };

    vi.spyOn(serverModule, 'createAdminClient').mockReturnValue(mockAdminClient as any);
  });

  describe('Finding 15.3: Inbound Webhook Idempotency', () => {
    it('records first-time inbound webhook event successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'evt-rec-123' },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockAdminClient.from.mockReturnValue({ insert: mockInsert });

      const result = await recordInboundWebhookEvent({
        provider: 'github',
        externalEventId: 'del-uuid-001',
        eventType: 'issues.opened',
        payload: { issue: 42 },
      });

      expect(result).toEqual({
        isDuplicate: false,
        eventId: 'evt-rec-123',
      });
      expect(mockAdminClient.from).toHaveBeenCalledWith('inbound_webhook_events');
      expect(mockInsert).toHaveBeenCalledWith({
        provider: 'github',
        external_event_id: 'del-uuid-001',
        event_type: 'issues.opened',
        payload: { issue: 42 },
        status: 'received',
      });
    });

    it('identifies duplicate event delivery via PostgreSQL unique constraint (23505)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "uq_inbound_provider_event"',
        },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockAdminClient.from.mockReturnValue({ insert: mockInsert });

      const result = await recordInboundWebhookEvent({
        provider: 'github',
        externalEventId: 'del-uuid-001',
        eventType: 'issues.opened',
        payload: { issue: 42 },
      });

      expect(result).toEqual({
        isDuplicate: true,
      });
    });
  });

  describe('Finding 15.1: Webhook Dispatcher RLS & Admin Client Scoping', () => {
    it('aborts cleanly if workspaceId is missing (Tenant boundary protection)', async () => {
      const invalidEvent: any = {
        id: 'evt-no-workspace',
        type: 'task.created',
        payload: { id: 'task-1' },
      };

      await dispatchEvent(invalidEvent);
      // createAdminClient should not even be called if workspaceId is absent
      expect(mockAdminClient.from).not.toHaveBeenCalled();
    });

    it('uses createAdminClient to insert idempotency record and fetch endpoints', async () => {
      // 1. Mock webhook_idempotency insert
      const mockSingleIdemp = vi.fn().mockResolvedValue({
        data: { event_id: 'evt-001' },
        error: null,
      });
      const mockSelectIdemp = vi.fn().mockReturnValue({ single: mockSingleIdemp });
      const mockInsertIdemp = vi.fn().mockReturnValue({ select: mockSelectIdemp });

      // 2. Mock webhook_endpoints query
      const mockEndpointsFilterStatus = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ep-1',
            workspace_id: 'ws-test-1',
            url: 'https://example.com/webhook',
            secret: 'secret-1',
            status: 'active',
            subscribed_events: ['task.created'],
          },
        ],
        error: null,
      });
      const mockEndpointsFilterWorkspace = vi.fn().mockReturnValue({
        eq: mockEndpointsFilterStatus,
      });
      const mockEndpointsSelect = vi.fn().mockReturnValue({
        eq: mockEndpointsFilterWorkspace,
      });

      // 3. Mock webhook_deliveries insert
      const mockSingleDelivery = vi.fn().mockResolvedValue({
        data: { id: 'del-1' },
        error: null,
      });
      const mockSelectDelivery = vi.fn().mockReturnValue({ single: mockSingleDelivery });
      const mockInsertDelivery = vi.fn().mockReturnValue({ select: mockSelectDelivery });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'webhook_idempotency') {
          return { insert: mockInsertIdemp };
        }
        if (table === 'webhook_endpoints') {
          return { select: mockEndpointsSelect };
        }
        if (table === 'webhook_deliveries') {
          return { insert: mockInsertDelivery };
        }
        return {};
      });

      const validEvent: any = {
        id: 'evt-001',
        type: 'task.created',
        workspaceId: 'ws-test-1',
        payload: { title: 'New Task' },
      };

      await dispatchEvent(validEvent);

      // Verify createAdminClient was used
      expect(serverModule.createAdminClient).toHaveBeenCalled();
      expect(mockAdminClient.from).toHaveBeenCalledWith('webhook_idempotency');
      expect(mockInsertIdemp).toHaveBeenCalledWith({ event_id: 'evt-001' });

      // Verify endpoints queried strictly inside workspace boundary
      expect(mockEndpointsFilterWorkspace).toHaveBeenCalledWith('workspace_id', 'ws-test-1');

      // Verify delivery record created with pending status inside workspace
      expect(mockInsertDelivery).toHaveBeenCalledWith({
        endpoint_id: 'ep-1',
        workspace_id: 'ws-test-1',
        event_id: 'evt-001',
        event_type: 'task.created',
        status: 'pending',
        payload: validEvent,
      });
    });

    it('gracefully skips dispatch when duplicate event_id is submitted', async () => {
      // Mock unique constraint error on webhook_idempotency
      const mockSingleIdemp = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' },
      });
      const mockSelectIdemp = vi.fn().mockReturnValue({ single: mockSingleIdemp });
      const mockInsertIdemp = vi.fn().mockReturnValue({ select: mockSelectIdemp });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'webhook_idempotency') {
          return { insert: mockInsertIdemp };
        }
        return {};
      });

      const duplicateEvent: any = {
        id: 'evt-duplicate-123',
        type: 'task.created',
        workspaceId: 'ws-test-1',
        payload: {},
      };

      await dispatchEvent(duplicateEvent);

      // Idempotency table checked
      expect(mockAdminClient.from).toHaveBeenCalledWith('webhook_idempotency');
      // Delivery table must NEVER be called
      expect(mockAdminClient.from).not.toHaveBeenCalledWith('webhook_deliveries');
    });
  });
});

