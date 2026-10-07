import { vi, Mock } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ChainableMock {
  select: Mock;
  eq: Mock;
  neq: Mock;
  in: Mock;
  ilike: Mock;
  lt: Mock;
  not: Mock;
  order: Mock;
  limit: Mock;
  is: Mock;
  update: Mock;
  insert: Mock;
  single: Mock;
  then: Mock;
}

export const createChainable = (data: Record<string, unknown> | any[] | null, error: Error | null = null, count: number | null = null): ChainableMock => {
  const chain = {} as ChainableMock;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.lt = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain.then = vi.fn((resolve: any) => resolve({ data: Array.isArray(data) ? data : (data ? [data] : []), count, error }));
  return chain;
};

export type MockSupabaseClient = SupabaseClient & {
  from: Mock;
  rpc: Mock;
};

export function createMockSupabase(overrides: Record<string, () => ChainableMock> = {}): MockSupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn((table: string) => {
      if (overrides[table]) {
        return overrides[table]();
      }

      if (table === 'ai_workflows') {
        const chain = createChainable({ status: 'COMPLETED', plan: { steps: [] }, executor_id: 'test-executor' });
        chain.update = vi.fn(() => chain);
        return chain;
      }

      if (table === 'ai_action_logs') {
        return createChainable(null);
      }

      if (table === 'ai_workspace_policies') {
        return createChainable({ 
          ai_enabled: true, 
          max_budget_usd: 1000, 
          max_daily_requests: 1000,
          allow_ai_task_creation: true,
          allow_ai_task_assignment: true,
          allow_ai_task_updates: true,
          max_workflow_steps: 10,
          max_concurrent_workflows: 5,
          require_action_approval: true
        });
      }

      if (table === 'ai_usage_metrics') {
        return createChainable({ usage_usd: 10 });
      }

      return createChainable(null);
    })
  } as unknown as MockSupabaseClient;
}
