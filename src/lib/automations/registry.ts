import { z } from 'zod';

// ==========================================
// 1. TRIGGER REGISTRY
// ==========================================

export const TriggerTypeSchema = z.enum([
  'task.created',
  'task.updated',
  'task.status_changed',
  'task.assigned',
  'task.completed',
  'task.overdue',
  'project.created',
  'project.status_changed',
  'project.budget_warning_reached',
  'project.budget_critical_reached',
  'request.created',
  'request.approved'
]);

export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const TriggerDefinitions: Record<TriggerType, {
  id: TriggerType;
  label: string;
  description: string;
  supportedEntity: 'task' | 'project' | 'request';
}> = {
  'task.created': {
    id: 'task.created',
    label: 'Task created',
    description: 'Runs when a new task is created.',
    supportedEntity: 'task',
  },
  'task.updated': {
    id: 'task.updated',
    label: 'Task updated',
    description: 'Runs when a task is updated.',
    supportedEntity: 'task',
  },
  'task.status_changed': {
    id: 'task.status_changed',
    label: 'Task status changes',
    description: 'Runs when a task moves to a new status.',
    supportedEntity: 'task',
  },
  'task.assigned': {
    id: 'task.assigned',
    label: 'Task assigned',
    description: 'Runs when a user is assigned to a task.',
    supportedEntity: 'task',
  },
  'task.completed': {
    id: 'task.completed',
    label: 'Task completed',
    description: 'Runs when a task is marked as Done.',
    supportedEntity: 'task',
  },
  'task.overdue': {
    id: 'task.overdue',
    label: 'Task becomes overdue',
    description: 'Runs when a task passes its due date.',
    supportedEntity: 'task',
  },
  'project.created': {
    id: 'project.created',
    label: 'Project created',
    description: 'Runs when a new project is created.',
    supportedEntity: 'project',
  },
  'project.status_changed': {
    id: 'project.status_changed',
    label: 'Project status changes',
    description: 'Runs when a project status is changed.',
    supportedEntity: 'project',
  },
  'project.budget_warning_reached': {
    id: 'project.budget_warning_reached',
    label: 'Budget Warning Reached',
    description: 'Runs when a project time budget crosses the warning threshold.',
    supportedEntity: 'project',
  },
  'project.budget_critical_reached': {
    id: 'project.budget_critical_reached',
    label: 'Budget Critical Reached',
    description: 'Runs when a project time budget crosses 100%.',
    supportedEntity: 'project',
  },
  'request.created': {
    id: 'request.created',
    label: 'Request created',
    description: 'Runs when a new request form is submitted.',
    supportedEntity: 'request',
  },
  'request.approved': {
    id: 'request.approved',
    label: 'Request approved',
    description: 'Runs when a request is approved.',
    supportedEntity: 'request',
  },
};


// ==========================================
// 2. CONDITION REGISTRY
// ==========================================

export const ConditionFieldSchema = z.enum([
  'task.status',
  'task.priority',
  'task.assignee',
  'task.project',
  'task.creator',
  'task.due_date',
  'project.status',
  'project.owner',
  'request.status',
  'request.priority'
]);

export type ConditionField = z.infer<typeof ConditionFieldSchema>;

export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than',
  'before',
  'after',
  'is_overdue'
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const ConditionFieldDefinitions: Record<ConditionField, {
  id: ConditionField;
  label: string;
  type: 'string' | 'select' | 'user' | 'project' | 'date' | 'boolean';
  supportedOperators: ConditionOperator[];
}> = {
  'task.status': {
    id: 'task.status',
    label: 'Status',
    type: 'select',
    supportedOperators: ['equals', 'not_equals'],
  },
  'task.priority': {
    id: 'task.priority',
    label: 'Priority',
    type: 'select',
    supportedOperators: ['equals', 'not_equals'],
  },
  'task.assignee': {
    id: 'task.assignee',
    label: 'Assignee',
    type: 'user',
    supportedOperators: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  },
  'task.project': {
    id: 'task.project',
    label: 'Project',
    type: 'project',
    supportedOperators: ['equals', 'not_equals'],
  },
  'task.creator': {
    id: 'task.creator',
    label: 'Creator',
    type: 'user',
    supportedOperators: ['equals', 'not_equals'],
  },
  'task.due_date': {
    id: 'task.due_date',
    label: 'Due Date',
    type: 'date',
    supportedOperators: ['equals', 'not_equals', 'before', 'after', 'is_overdue', 'is_empty', 'is_not_empty'],
  },
  'project.status': {
    id: 'project.status',
    label: 'Project Status',
    type: 'select',
    supportedOperators: ['equals', 'not_equals'],
  },
  'project.owner': {
    id: 'project.owner',
    label: 'Project Owner',
    type: 'user',
    supportedOperators: ['equals', 'not_equals'],
  },
  'request.status': {
    id: 'request.status',
    label: 'Request Status',
    type: 'select',
    supportedOperators: ['equals', 'not_equals'],
  },
  'request.priority': {
    id: 'request.priority',
    label: 'Request Priority',
    type: 'select',
    supportedOperators: ['equals', 'not_equals'],
  }
};


// ==========================================
// 3. ACTION REGISTRY
// ==========================================

export const ActionTypeSchema = z.enum([
  'task.create',
  'task.update',
  'task.assign',
  'task.set_status',
  'task.set_priority',
  'task.add_comment',
  'notify.user',
  'request.update_status',
  'webhook.send'
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionDefinitions: Record<ActionType, {
  id: ActionType;
  label: string;
  description: string;
  icon: string; // Used for UI
  requiredConfigFields: string[];
}> = {
  'task.create': {
    id: 'task.create',
    label: 'Create Task',
    description: 'Create a new task in a project.',
    icon: 'CheckSquare',
    requiredConfigFields: ['title', 'projectId'],
  },
  'task.update': {
    id: 'task.update',
    label: 'Update Task',
    description: 'Update properties of the triggered task.',
    icon: 'Edit2',
    requiredConfigFields: [],
  },
  'task.assign': {
    id: 'task.assign',
    label: 'Assign Task',
    description: 'Assign the task to a specific user.',
    icon: 'UserPlus',
    requiredConfigFields: ['userId'],
  },
  'task.set_status': {
    id: 'task.set_status',
    label: 'Set Status',
    description: 'Change the status of the task.',
    icon: 'Kanban',
    requiredConfigFields: ['status'],
  },
  'task.set_priority': {
    id: 'task.set_priority',
    label: 'Set Priority',
    description: 'Change the priority of the task.',
    icon: 'AlertCircle',
    requiredConfigFields: ['priority'],
  },
  'task.add_comment': {
    id: 'task.add_comment',
    label: 'Add Comment',
    description: 'Add a comment to the task.',
    icon: 'MessageSquare',
    requiredConfigFields: ['content'],
  },
  'notify.user': {
    id: 'notify.user',
    label: 'Send Notification',
    description: 'Send an in-app notification to a user.',
    icon: 'Bell',
    requiredConfigFields: ['userId', 'message'],
  },
  'request.update_status': {
    id: 'request.update_status',
    label: 'Update Request Status',
    description: 'Change the status of a request.',
    icon: 'FileText',
    requiredConfigFields: ['status'],
  },
  'webhook.send': {
    id: 'webhook.send',
    label: 'Send Webhook',
    description: 'Trigger an external webhook.',
    icon: 'Webhook',
    requiredConfigFields: ['endpointId'],
  }
};
