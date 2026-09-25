export type User = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  ownerId?: string;
  role?: string;
};

export type Team = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  role?: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  organizationId: string;
  teamId?: string;
  orgSlug?: string;
  teamSlug?: string;
};

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed';

export type Project = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  status: ProjectStatus;
  progress: number;
  taskCount: number;
  members: User[];
  updatedAt: string;
  templateId?: string;
  taskTypes?: string[];
};

export type TaskStatus = 'Backlog' | 'Todo' | 'In Progress' | 'Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type TaskDependencyType = 'blocking' | 'related' | 'duplicate';

export type TaskDependency = {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: TaskDependencyType;
  task?: Task; // The referenced task
  createdAt: string;
};

export type TaskAttachment = {
  id: string;
  taskId: string;
  workspaceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  uploadedBy: string | null;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  workspaceId: string;
  taskType?: string;
  reporterId?: string | null;
  customerId?: string | null;
  requestId?: string | null;
  approvalId?: string; // links to an approval
  documentId?: string; // links to a specific document

  // Phase 11D - Workload
  estimatedHours?: number;
  storyPoints?: number;
  assignee?: User;
  labels?: Label[];
  position: number;
  startDate?: string;
  dueDate?: string;
  parentId?: string | null;
  subtasks?: Task[];
  dependencies?: TaskDependency[];
  blockedBy?: TaskDependency[];
  attachments?: TaskAttachment[];
  watchers?: { userId: string }[];
  milestoneId?: string | null;
  estimatedTime?: number | null; // in minutes
  recurrenceRule?: string | null;
  isRecurring?: boolean;
  nextOccurrence?: string | null;
  recurringParentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityAction = 'created' | 'completed' | 'commented on' | 'moved' | 'updated' | 'deleted';

export type Activity = {
  id: string;
  user: User;
  action: ActivityAction;
  target: string;
  timestamp: string;
};

export type Comment = {
  id: string;
  taskId: string;
  workspaceId: string;
  author: User;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationType = 'mention' | 'assignment' | 'system';

export type Notification = {
  id: string;
  workspaceId: string;
  recipientId: string;
  actor?: User;
  type: NotificationType;
  entityType: 'task' | 'project' | 'comment';
  entityId: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
};


export type Milestone = {
  id: string;
  projectId: string;
  workspaceId: string;
  name: string;
  description?: string;
  ownerId?: string;
  startDate?: string;
  dueDate?: string;
  status: 'Open' | 'Completed';
  createdAt: string;
  updatedAt: string;
};

export type SavedFilter = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  filterData: Record<string, any>;
  createdAt: string;
};

export type Automation = {
  id: string;
  workspaceId: string;
  name: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  actionType: string;
  actionConfig?: Record<string, any>;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStatus = {
  id: string;
  projectId: string;
  name: string;
  color: string | null;
  position: number;
  category: 'Todo' | 'In Progress' | 'Done' | 'Cancelled';
  isDefault: boolean;
  allowedTransitions: string[];
};

export type TimeEntry = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  description?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes: number;
  billable: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  timesheetId?: string | null;
  source: 'MANUAL' | 'TIMER' | 'AUTOMATION' | 'API';
  createdAt: string;
  updatedAt: string;
};

export type Timesheet = {
  id: string;
  workspaceId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBudget = {
  id: string;
  workspaceId: string;
  projectId: string;
  budgetType: 'TIME' | 'COST' | 'TIME_AND_COST';
  budgetMinutes: number;
  budgetAmount?: number | null;
  warningThreshold: number;
  criticalThreshold: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
};
