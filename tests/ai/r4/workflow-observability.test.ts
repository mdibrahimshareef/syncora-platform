import { describe, it, expect} from 'vitest';
import { isValidWorkflowTransition, isValidStepTransition } from '../../../src/lib/ai/workflow-state';

describe('Workflow State Machine (R4.2)', () => {
  it('allows valid workflow transitions', () => {
    expect(isValidWorkflowTransition('PLANNING', 'AWAITING_APPROVAL')).toBe(true);
    expect(isValidWorkflowTransition('AWAITING_APPROVAL', 'EXECUTING')).toBe(true);
    expect(isValidWorkflowTransition('EXECUTING', 'VERIFYING')).toBe(true);
    expect(isValidWorkflowTransition('EXECUTING', 'PARTIALLY_COMPLETED')).toBe(true);
    expect(isValidWorkflowTransition('EXECUTING', 'FAILED')).toBe(true);
    expect(isValidWorkflowTransition('EXECUTING', 'COMPLETED')).toBe(true);
  });

  it('blocks invalid workflow transitions', () => {
    expect(isValidWorkflowTransition('COMPLETED', 'EXECUTING')).toBe(false);
    expect(isValidWorkflowTransition('CANCELLED', 'EXECUTING')).toBe(false);
    expect(isValidWorkflowTransition('FAILED', 'COMPLETED')).toBe(false); // Must go to EXECUTING via RETRY
  });

  it('allows valid step transitions', () => {
    expect(isValidStepTransition('PENDING', 'EXECUTING')).toBe(true);
    expect(isValidStepTransition('EXECUTING', 'VERIFYING')).toBe(true);
    expect(isValidStepTransition('EXECUTING', 'FAILED')).toBe(true);
    expect(isValidStepTransition('VERIFYING', 'COMPLETED')).toBe(true);
    expect(isValidStepTransition('FAILED', 'RETRYING')).toBe(true);
  });

  it('blocks invalid step transitions', () => {
    expect(isValidStepTransition('COMPLETED', 'EXECUTING')).toBe(false);
    expect(isValidStepTransition('PENDING', 'COMPLETED')).toBe(false); // Must EXECUTING first
  });
});
