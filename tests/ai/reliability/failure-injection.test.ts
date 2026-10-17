import { describe, it, expect, vi } from 'vitest';
import { executeWorkflowPlan } from '../../../src/lib/ai/workflow-executor';
import { AIDispatcher } from '../../../src/lib/ai/dispatcher';
import { AIError, getUserFacingMessage } from '../../../src/lib/ai/errors';
import { WorkflowPlan } from '../../../src/lib/ai/workflow-schema';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('Release 4.8 Reliability & Failure Injection (Part 6)', () => {
  // ==========================================
  // 1. PROVIDER FAILURE SCENARIOS (Section 6.1)
  // ==========================================
  describe('Provider Failure Handling', () => {
    it('classifies provider timeout cleanly and returns clear user-facing explanation', () => {
      const error = new AIError('PROVIDER_TIMEOUT', 'Upstream LLM socket timed out after 45000ms');
      expect(error.category).toBe('PROVIDER_TIMEOUT');
      expect(error.userMessage).toContain('timed out');
      expect(getUserFacingMessage('PROVIDER_TIMEOUT')).toBe(error.userMessage);
    });

    it('classifies provider rate limit and gives wait guidance without exposing raw headers', () => {
      const error = new AIError('PROVIDER_RATE_LIMIT', 'HTTP 429 Too Many Requests from OpenAI API');
      expect(error.category).toBe('PROVIDER_RATE_LIMIT');
      expect(error.userMessage).toContain('request limit');
      expect(error.userMessage).not.toContain('OpenAI'); // Does not leak raw backend provider internals to user
    });

    it('classifies provider authentication errors safely without leaking credentials', () => {
      const error = new AIError('PROVIDER_AUTH_ERROR', 'Invalid API Key provided: sk-abcdef1234567890');
      expect(error.category).toBe('PROVIDER_AUTH_ERROR');
      expect(error.userMessage).toContain('authentication failed');
      expect(error.userMessage).not.toContain('sk-abcdef');
    });

    it('classifies malformed model output without crashing runtime', () => {
      const error = new AIError('INVALID_MODEL_OUTPUT', 'Failed to parse JSON response: Unexpected token <');
      expect(error.category).toBe('INVALID_MODEL_OUTPUT');
      expect(error.userMessage).toContain('unparseable or schema-invalid');
    });
  });

  // ==========================================
  // 2. PARTIAL WORKFLOW FAILURE & IDEMPOTENCY (Section 6.4)
  // ==========================================
  describe('Partial Workflow Failure & Step-Level Idempotency', () => {
    it('accurately records completed steps when a subsequent step fails, avoiding duplicate execution on retry', async () => {
      const plan: WorkflowPlan = {
        title: 'Two-Step Data Migration',
        description: 'Migrate users and create welcome task',
        steps: [
          {
            stepId: 'step-1-create',
            tool: 'create_task',
            args: { title: 'Welcome Task', priority: 'medium' }
          },
          {
            stepId: 'step-2-fail',
            tool: 'create_task',
            args: { title: 'Failing Subtask' },
            dependsOn: ['step-1-create']
          }
        ]
      };

      const step1ActionId = `wf-partial-test-step-1-create`;
      const step2ActionId = `wf-partial-test-step-2-fail`;

      // Track action log database states
      const actionLogs: Record<string, any> = {};
      let workflowState = 'PENDING';
      let currentExecutorId: string | null = null;

      const mockSupabase = createMockSupabase();
      (mockSupabase as any).from = (table: string) => {
        if (table === 'ai_workflows') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => Promise.resolve({
                  data: {
                    id: 'wf-partial-test',
                    status: workflowState,
                    executor_id: currentExecutorId || 'test-executor',
                    timeout_at: new Date(Date.now() + 100000).toISOString()
                  },
                  error: null
                })),
                in: vi.fn().mockResolvedValue({ count: 0, data: [] })
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn((data: any) => {
              if (data.status) workflowState = data.status;
              if (data.executor_id !== undefined) currentExecutorId = data.executor_id;
              const updateChain: any = {};
              updateChain.eq = vi.fn(() => updateChain);
              updateChain.select = vi.fn(() => updateChain);
              updateChain.single = vi.fn().mockImplementation(() => Promise.resolve({
                data: { id: 'wf-partial-test', ...data, executor_id: currentExecutorId },
                error: null
              }));
              updateChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
              return updateChain;
            })
          };
        }

        if (table === 'ai_action_logs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: actionLogs[val] || null,
                  error: null
                })
              }))
            })),
            insert: vi.fn((data: any) => {
              actionLogs[data.action_id] = { ...data, status: 'pending' };
              return Promise.resolve({ error: null });
            }),
            update: vi.fn((data: any) => ({
              eq: vi.fn((col: string, val: string) => {
                if (actionLogs[val]) {
                  actionLogs[val] = { ...actionLogs[val], ...data };
                }
                return Promise.resolve({ error: null });
              })
            }))
          };
        }

        if (table === 'projects') {
          return createChainable({ id: 'proj-1', name: 'Default Project' });
        }
        if (table === 'ai_workspace_policies') {
          return createChainable({ ai_enabled: true, max_workflow_steps: 10, max_concurrent_workflows: 5 });
        }
        if (table === 'ai_usage_metrics') {
          return createChainable({ chat_requests: 1, workflow_requests: 1, action_requests: 0 });
        }
        return createChainable(null);
      };

      const executeActionSpy = vi.spyOn(await import('../../../src/lib/ai/action-executor'), 'executeAction')
        .mockResolvedValueOnce({ status: 'completed', data: { id: 'task-1', title: 'Welcome Task' } })
        .mockResolvedValueOnce({ status: 'failed', error: 'Simulated DB Constraint Failure' });

      const result = await executeWorkflowPlan(mockSupabase as any, 'ws-partial', 'user-1', {
        ...plan,
        workflowId: 'wf-partial-test'
      });

      executeActionSpy.mockRestore();

      // 1. Workflow must report partial completion
      expect(result.status).toBe('PARTIALLY_COMPLETED');
      expect(result.completedSteps).toContain('step-1-create');
      expect(result.failedStep).toBe('step-2-fail');
      expect(result.error).toBe('Simulated DB Constraint Failure');

      // 2. Action logs must confirm step 1 completed and step 2 failed
      expect(actionLogs[step1ActionId]?.status).toBe('completed');
      expect(actionLogs[step2ActionId]?.status).toBe('failed');
    });
  });

  // ==========================================
  // 3. BACKGROUND RUNTIME & LEASE HIJACK DEFENSE (Section 6.3)
  // ==========================================
  describe('Background Runtime & Worker Integrity', () => {
    it('detects lease hijacking: stale worker is rejected if executor_id was stolen', async () => {
      const plan: WorkflowPlan = {
        title: 'Single Step',
        description: 'Test worker hijacking',
        steps: [{ stepId: 'step-1', tool: 'get_task', args: { taskId: 't-1' } }]
      };

      const mockSupabase = createMockSupabase();
      (mockSupabase as any).from = (table: string) => {
        if (table === 'ai_workflows') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'wf-hijack-test',
                    status: 'RUNNING',
                    executor_id: 'DIFFERENT-WORKER-UUID', // Lease hijacked by another worker
                    timeout_at: new Date(Date.now() + 100000).toISOString()
                  },
                  error: null
                }),
                in: vi.fn().mockResolvedValue({ count: 0, data: [] })
              }))
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'wf-hijack-test' },
                    error: null
                  })
                })
              })
            }))
          };
        }
        if (table === 'ai_workspace_policies') {
          return createChainable({ ai_enabled: true, max_workflow_steps: 10, max_concurrent_workflows: 5 });
        }
        if (table === 'ai_usage_metrics') {
          return createChainable({ chat_requests: 0, workflow_requests: 0, action_requests: 0 });
        }
        return createChainable(null);
      };

      const result = await executeWorkflowPlan(mockSupabase as any, 'ws-test', 'user-1', {
        ...plan,
        workflowId: 'wf-hijack-test'
      });

      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('lease was lost or hijacked');
    });

    it('enforces max_attempts retry cap in AIDispatcher: terminal FAILED status upon reaching limit', async () => {
      let jobStatus = 'RUNNING';
      let attemptCount = 2; // Job currently on 2nd attempt, max_attempts = 3

      const mockSupabase = createMockSupabase();
      (mockSupabase as any).from = (table: string) => {
        if (table === 'ai_jobs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'job-failing-capped',
                    attempt_count: attemptCount,
                    max_attempts: 3,
                    workspace_id: 'ws-test',
                    user_id: 'usr-1'
                  },
                  error: null
                })
              }))
            })),
            update: vi.fn((data: any) => {
              if (data.status) jobStatus = data.status;
              if (data.attempt_count) attemptCount = data.attempt_count;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            })
          };
        }
        if (table === 'ai_workflows') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'wf-failing', plan: { steps: [] } },
                  error: null
                }),
                in: vi.fn().mockResolvedValue({ count: 0, data: [] })
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            }))
          };
        }
        if (table === 'ai_workspace_policies') {
          return createChainable({ ai_enabled: true, max_workflow_steps: 10, max_daily_requests: 1000 });
        }
        if (table === 'ai_usage_metrics') {
          return createChainable({ chat_requests: 0, workflow_requests: 0, action_requests: 0 });
        }
        return createChainable(null);
      };

      const dispatcher = new AIDispatcher(mockSupabase as any, 'worker-cap-test');
      const failingJob = {
        id: 'job-failing-capped',
        workspace_id: 'ws-test',
        user_id: 'usr-1',
        job_type: 'EVENT_TRIGGERED' as const,
        trigger_type: 'test.fail',
        status: 'QUEUED' as const,
        priority: 0,
        attempt_count: 2,
        max_attempts: 3,
        payload: {
          plan: {
            title: 'Failing Workflow',
            steps: [
              {
                stepId: 'fail-step',
                tool: 'nonexistent_tool_action',
                args: {}
              }
            ]
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await dispatcher.processJob(failingJob as any);

      // On 3rd attempt failure, job MUST be marked FAILED, NOT RECOVERY_PENDING
      expect(jobStatus).toBe('FAILED');
      expect(attemptCount).toBe(3);
    });
  });
});
