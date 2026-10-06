import { describe, it, expect } from 'vitest';
import { calculateToolRisk, calculatePlanRisk } from '../../../src/lib/ai/risk';
import { WorkflowPlan } from '../../../src/lib/ai/workflow-schema';

describe('Server-Side Risk Engine (R4.1)', () => {
  it('classifies read-only operations as LOW', () => {
    expect(calculateToolRisk('get_my_work')).toBe('LOW');
    expect(calculateToolRisk('search')).toBe('LOW');
  });

  it('classifies standard mutations as MEDIUM', () => {
    expect(calculateToolRisk('create_task')).toBe('MEDIUM');
    expect(calculateToolRisk('assign_task')).toBe('MEDIUM');
  });

  it('classifies destructive or unknown as HIGH', () => {
    expect(calculateToolRisk('delete_task')).toBe('HIGH');
    expect(calculateToolRisk('some_fake_tool')).toBe('HIGH');
  });

  it('calculates highest risk for plan', () => {
    const plan: WorkflowPlan = {
      title: 'Plan',
      description: 'Desc',
      steps: [
        { stepId: '1', tool: 'search', args: {} },
        { stepId: '2', tool: 'create_task', args: {} }
      ]
    };
    expect(calculatePlanRisk(plan)).toBe('MEDIUM');
  });

  it('upgrades to HIGH for bulk operations', () => {
    const plan: WorkflowPlan = {
      title: 'Plan',
      description: 'Desc',
      steps: [
        { stepId: '1', tool: 'create_task', args: {} },
        { stepId: '2', tool: 'update_task', args: {} },
        { stepId: '3', tool: 'assign_task', args: {} },
        { stepId: '4', tool: 'create_task', args: {} }
      ]
    };
    expect(calculatePlanRisk(plan)).toBe('HIGH');
  });
});
