import { create } from 'zustand'
import { toast } from 'sonner'
import { Task, Project, WorkflowStatus, Activity, User, Workspace } from '@/types'
import { createClient } from '@/lib/supabase/client'
import * as projectApi from '@/lib/api/projects'
import * as taskApi from '@/lib/api/tasks'
import * as activityApi from '@/lib/api/activity'
import * as searchApi from '@/lib/api/search'
import * as requestsApi from '@/lib/api/requests'
import * as approvalsApi from '@/lib/api/approvals'
import * as documentsApi from '@/lib/api/documents'
import * as notificationsApi from '@/lib/api/notifications'
import * as customersApi from '@/lib/api/customers'
import * as milestonesApi from '@/lib/api/milestones'
import * as filtersApi from '@/lib/api/filters'
import * as automationsApi from '@/lib/api/automations'
import { createProjectFromTemplate as apiCreateProjectFromTemplate, getTemplates } from '@/lib/api/templates'
import { Template } from '@/lib/api/templates'

type DataState = {
  tasks: Task[]
  workspaceTasks: Task[]
  milestones: import('@/types').Milestone[]
  savedFilters: import('@/types').SavedFilter[]
  templates: Template[]
  searchResults: searchApi.SearchResult[]
  isSearching: boolean
  projects: Project[]
  projectStatuses: WorkflowStatus[]
  activity: Activity[]
  workspaces: Workspace[]
  workspaceMembers: User[]
  onlineWorkspaceUsers: any[]
  documents: any[]
  requests: any[]
  requestForms: any[]
  approvals: any[]
  customers: customersApi.Customer[]
  customerRequests: customersApi.CustomerRequest[]
  notifications: notificationsApi.Notification[]
  automations: automationsApi.Automation[]
  automationRuns: automationsApi.AutomationRun[]
  unreadNotificationCount: number
  currentUser: User | null
  activeWorkspaceId: string | null
  isLoading: boolean
  error: string | null

  setOnlineWorkspaceUsers: (users: any[]) => void

  setInitialData: (data: { 
    currentUser: User | null, 
    activeWorkspaceId: string | null,
    workspaces?: Workspace[],
    projects?: Project[],
    tasks?: Task[],
    activity?: Activity[]
  }) => void
  setActiveWorkspaceId: (id: string | null) => void
  updateCurrentUser: (updates: Partial<User>) => Promise<void>
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>

  // Fetchers
  fetchProjectStatuses: (projectId: string) => Promise<void>
  fetchProjects: () => Promise<void>
  fetchTasks: (projectId: string) => Promise<void>
  fetchMilestones: (projectId: string) => Promise<void>
  fetchSavedFilters: () => Promise<void>
  fetchTemplates: () => Promise<void>
  fetchWorkspaceTasks: () => Promise<void>
  fetchActivity: () => Promise<void>
  fetchWorkspaceMembers: () => Promise<void>
  globalSearch: (query: string) => Promise<void>
  clearSearch: () => void
  fetchDocuments: () => Promise<void>
  fetchRequests: () => Promise<void>
  fetchRequestForms: () => Promise<void>
  fetchApprovals: () => Promise<void>
  fetchCustomers: () => Promise<void>
  fetchCustomerRequests: () => Promise<void>
  fetchNotifications: () => Promise<void>
  fetchAutomations: () => Promise<void>
  fetchAutomationRuns: () => Promise<void>
  markNotificationAsRead: (id: string) => Promise<void>
  markAllNotificationsAsRead: () => Promise<void>

  // Document Actions
  createDocument: (payload: any) => Promise<string>
  updateDocument: (id: string, updates: any) => Promise<void>
  deleteDocument: (id: string) => Promise<void>

  // Request Actions
  createRequestForm: (payload: any) => Promise<any>
  submitRequest: (payload: any) => Promise<any>
  updateRequestStatus: (id: string, status: string, linkedTaskId?: string) => Promise<void>

  // Customer Actions
  createCustomer: (payload: any) => Promise<any>
  createCustomerRequest: (payload: any) => Promise<any>
  updateCustomerRequest: (id: string, updates: any) => Promise<void>

  // Approval Actions
  requestApproval: (payload: any) => Promise<any>
  resolveApproval: (id: string, status: 'Approved' | 'Rejected' | 'Changes Requested', comment?: string) => Promise<void>

  // Task Actions
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'dependencies' | 'blockedBy' | 'subtasks'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  bulkUpdateTasks: (ids: string[], updates: { status?: import('@/types').TaskStatus, priority?: import('@/types').TaskPriority }) => Promise<void>
  bulkDeleteTasks: (ids: string[]) => Promise<void>
  moveTask: (id: string, newStatus: import('@/types').TaskStatus) => Promise<void>
  reorderTasks: (tasks: import('@/types').Task[]) => Promise<void>
  addDependency: (taskId: string, dependsOnTaskId: string, type?: import('@/types').TaskDependencyType) => Promise<void>
  removeDependency: (dependencyId: string) => Promise<void>
  addAttachment: (file: File, taskId: string) => Promise<void>
  removeAttachment: (attachmentId: string, storagePath: string) => Promise<void>
  toggleWatcher: (taskId: string, follow: boolean) => Promise<void>

  // Milestone Actions
  createMilestone: (projectId: string, payload: Partial<import('@/types').Milestone>) => Promise<void>
  updateMilestone: (id: string, updates: Partial<import('@/types').Milestone>) => Promise<void>
  deleteMilestone: (id: string) => Promise<void>
  
  // Filter Actions
  saveFilter: (name: string, filterData: any) => Promise<void>
  deleteFilter: (id: string) => Promise<void>

  // Automation Actions
  createAutomation: (payload: { name: string, trigger_type: string, trigger_config: any, action_type: string, action_config: any }) => Promise<void>
  updateAutomation: (id: string, updates: Partial<automationsApi.Automation>) => Promise<void>
  deleteAutomation: (id: string) => Promise<void>
  toggleAutomation: (id: string, isActive: boolean) => Promise<void>

  // Project Actions
  fetchViews: () => Promise<void>

  // Project Actions
  createProject: (project: Omit<Project, 'id' | 'updatedAt' | 'taskCount' | 'progress' | 'members'>) => Promise<string>
  createProjectFromTemplate: (templateId: string, project: Omit<Project, 'id' | 'updatedAt' | 'taskCount' | 'progress' | 'members'> & { includeSampleData?: boolean }) => Promise<string>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  
  // Realtime Receivers
  applyRealtimeProjectInsert: (payload: any) => void
  applyRealtimeProjectUpdate: (payload: any) => void
  applyRealtimeProjectDelete: (payload: any) => void
  applyRealtimeTaskUpdate: (payload: any) => void
  applyRealtimeTaskInsert: (payload: any) => void
  applyRealtimeTaskDelete: (payload: any) => void
  applyRealtimeMilestoneInsert: (payload: any) => void
  applyRealtimeMilestoneUpdate: (payload: any) => void
  applyRealtimeMilestoneDelete: (payload: any) => void
  applyRealtimeNotification: (payload: any) => void
}

const generateId = () => `temp-${Math.random().toString(36).substring(2, 9)}`

export const useDataStore = create<DataState>()((set, get) => ({
  tasks: [],
  workspaceTasks: [],
  milestones: [],
  savedFilters: [],
  templates: [],
  searchResults: [],
  isSearching: false,
  projects: [],
  projectStatuses: [],
  activity: [],
  workspaces: [],
  workspaceMembers: [],
  onlineWorkspaceUsers: [],
  documents: [],
  requests: [],
  requestForms: [],
  approvals: [],
  customers: [],
  customerRequests: [],
  notifications: [],
  automations: [],
  automationRuns: [],
  unreadNotificationCount: 0,
  currentUser: null,
  activeWorkspaceId: null,
  isLoading: false,
  error: null,

  setOnlineWorkspaceUsers: (users) => set({ onlineWorkspaceUsers: users }),

  setInitialData: (data) => set((state) => ({
    ...state,
    ...data
  })),

  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

  updateCurrentUser: async (updates) => {
    const { currentUser } = get()
    if (!currentUser) return

    set({ currentUser: { ...currentUser, ...updates } })

    try {
      const supabase = createClient()
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.full_name = updates.name
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
      if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata

      if (Object.keys(dbUpdates).length > 0) {
        await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', currentUser.id)
      }
    } catch (err) {
      console.error('Failed to update user profile in DB:', err)
      // Note: In a production app, we might want to rollback the optimistic update on error
    }
  },

  updateWorkspace: async (id, updates) => {
    try {
      const supabase = createClient()
      
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl
      if (updates.organizationId !== undefined) dbUpdates.organization_id = updates.organizationId
      if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId
      
      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('workspaces')
          .update(dbUpdates)
          .eq('id', id)
          
        if (error) throw error
      }
      
      set((state) => ({
        workspaces: state.workspaces.map(w => w.id === id ? { ...w, ...updates } : w)
      }))
    } catch (err) {
      console.error('Failed to update workspace:', err)
      throw err
    }
  },

  fetchProjects: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return

    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const projects = await projectApi.getProjects(supabase, activeWorkspaceId)
      set({ projects, isLoading: false })
    } catch (err: unknown) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchTasks: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const tasks = await taskApi.getTasks(supabase, projectId)
      set({ tasks, isLoading: false })
    } catch (err: unknown) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchWorkspaceTasks: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const workspaceTasks = await taskApi.getWorkspaceTasks(supabase, activeWorkspaceId)
      set({ workspaceTasks, isLoading: false })
    } catch (err: unknown) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  globalSearch: async (query) => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    if (!query || query.trim() === '') {
      set({ searchResults: [], isSearching: false })
      return
    }

    set({ isSearching: true })
    try {
      const supabase = createClient()
      const searchResults = await searchApi.performGlobalSearch(supabase, activeWorkspaceId, query)
      set({ searchResults, isSearching: false })
    } catch (err) {
      set({ searchResults: [], isSearching: false })
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  fetchActivity: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return

    try {
      const supabase = createClient()
      const activity = await activityApi.getRecentActivity(supabase, activeWorkspaceId)
      set({ activity })
    } catch (err: unknown) {
      console.error(err)
    }
  },

  fetchWorkspaceMembers: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('workspace_members')
        .select(`
          profiles:user_id(id, full_name, avatar_url)
        `)
        .eq('workspace_id', activeWorkspaceId)
      
      if (data) {
        const members = data.map((d: any) => ({
          id: d.profiles.id,
          name: d.profiles.full_name || 'Unknown User',
          initials: (d.profiles.full_name || 'U').substring(0, 2).toUpperCase(),
          email: '',
          role: 'Member',
          avatarUrl: d.profiles.avatar_url || undefined
        }))
        set({ workspaceMembers: members })
      }
    } catch (err: unknown) {
      console.error(err)
    }
  },

  fetchDocuments: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const docs = await documentsApi.getDocuments(supabase, activeWorkspaceId)
      set({ documents: docs })
    } catch (err) {
      console.error('Failed to fetch documents', err)
    }
  },

  fetchRequests: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const reqs = await requestsApi.getRequests(supabase, activeWorkspaceId)
      set({ requests: reqs })
    } catch (err) {
      console.error('Failed to fetch requests', err)
    }
  },

  fetchMilestones: async (projectId) => {
    try {
      const supabase = createClient()
      const data = await milestonesApi.getMilestones(supabase, projectId)
      set({ milestones: data })
    } catch (error) {
      console.error("Failed to load milestones:", error)
    }
  },

  fetchSavedFilters: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const data = await filtersApi.getSavedFilters(supabase, activeWorkspaceId)
      set({ savedFilters: data })
    } catch (error) {
      console.error("Failed to load filters:", error)
    }
  },

  fetchTemplates: async () => {
    try {
      const supabase = createClient()
      const data = await getTemplates(supabase)
      set({ templates: data })
    } catch (error) {
      console.error("Failed to load templates:", error)
    }
  },

  fetchRequestForms: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const forms = await requestsApi.getRequestForms(supabase, activeWorkspaceId)
      set({ requestForms: forms })
    } catch (err) {
      console.error('Failed to fetch request forms', err)
    }
  },

  fetchApprovals: async () => {
    const { activeWorkspaceId, currentUser } = get()
    if (!activeWorkspaceId || !currentUser) return
    try {
      const supabase = createClient()
      const [requestedByMe, assignedToMe] = await Promise.all([
        approvalsApi.getApprovalsRequestedByMe(supabase, activeWorkspaceId, currentUser.id),
        approvalsApi.getApprovalsAssignedToMe(supabase, activeWorkspaceId, currentUser.id)
      ])
      // Merge unique approvals
      const map = new Map()
      requestedByMe.forEach(a => map.set(a.id, a))
      assignedToMe.forEach(a => map.set(a.id, a))
      set({ approvals: Array.from(map.values()) })
    } catch (err) {
      console.error('Failed to fetch approvals', err)
    }
  },

  fetchCustomers: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const customers = await customersApi.getCustomers(supabase, activeWorkspaceId)
      set({ customers })
    } catch (err) {
      console.error('Failed to fetch customers', err)
    }
  },

  fetchCustomerRequests: async () => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const customerRequests = await customersApi.getCustomerRequests(supabase, activeWorkspaceId)
      set({ customerRequests })
    } catch (err) {
      console.error('Failed to fetch customer requests', err)
    }
  },

  fetchNotifications: async () => {
    try {
      const supabase = createClient()
      const { currentUser } = get()
      if (!currentUser) return
      
      const notifications = await notificationsApi.getNotifications(supabase, currentUser.id)
      const count = await notificationsApi.getUnreadNotificationCount(supabase, currentUser.id)
      set({ notifications, unreadNotificationCount: count })
    } catch (error: any) {
      console.error('Error fetching notifications:', error)
    }
  },

  fetchAutomations: async () => {
    try {
      const supabase = createClient()
      const { activeWorkspaceId } = get()
      if (!activeWorkspaceId) return
      
      const automations = await automationsApi.getAutomations(supabase, activeWorkspaceId)
      set({ automations })
    } catch (error: any) {
      console.error('Error fetching automations:', error)
    }
  },

  fetchAutomationRuns: async () => {
    try {
      const supabase = createClient()
      const { activeWorkspaceId } = get()
      if (!activeWorkspaceId) return
      
      const automationRuns = await automationsApi.getAutomationRuns(supabase, activeWorkspaceId)
      set({ automationRuns })
    } catch (error: any) {
      console.error('Error fetching automation runs:', error)
    }
  },

  markNotificationAsRead: async (id: string) => {
    try {
      const supabase = createClient()
      const { notifications, unreadNotificationCount } = get()
      
      await notificationsApi.markNotificationAsRead(supabase, id)
      
      const updatedNotifications = notifications.map(n => 
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
      
      set({ 
        notifications: updatedNotifications,
        unreadNotificationCount: Math.max(0, unreadNotificationCount - 1)
      })
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const supabase = createClient()
      const { currentUser, notifications } = get()
      if (!currentUser) return
      
      await notificationsApi.markAllNotificationsAsRead(supabase, currentUser.id)
      
      const updatedNotifications = notifications.map(n => 
        !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
      )
      
      set({ 
        notifications: updatedNotifications,
        unreadNotificationCount: 0
      })
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error)
    }
  },

  createDocument: async (payload) => {
    const { activeWorkspaceId } = get()
    if (!activeWorkspaceId) throw new Error("No active workspace")
    const supabase = createClient()
    const newDoc = await documentsApi.createDocument(supabase, { ...payload, workspace_id: activeWorkspaceId })
    set({ documents: [newDoc, ...get().documents] })
    return newDoc.id
  },

  updateDocument: async (id, updates) => {
    const supabase = createClient()
    const updatedDoc = await documentsApi.updateDocument(supabase, id, updates)
    set({
      documents: get().documents.map(d => d.id === id ? { ...d, ...updatedDoc } : d)
    })
  },

  deleteDocument: async (id) => {
    const supabase = createClient()
    await documentsApi.deleteDocument(supabase, id)
    set({
      documents: get().documents.filter(d => d.id !== id)
    })
  },

  createRequestForm: async (payload) => {
    const supabase = createClient()
    const newForm = await requestsApi.createRequestForm(supabase, payload)
    set({ requestForms: [newForm, ...get().requestForms] })
    return newForm
  },

  submitRequest: async (payload) => {
    const supabase = createClient()
    const newReq = await requestsApi.submitRequest(supabase, payload)
    set({ requests: [newReq, ...get().requests] })
    return newReq
  },

  updateRequestStatus: async (id, status, linkedTaskId) => {
    const supabase = createClient()
    const updated = await requestsApi.updateRequestStatus(supabase, id, status, linkedTaskId)
    set({
      requests: get().requests.map(r => r.id === id ? { ...r, status, linked_task_id: linkedTaskId || r.linked_task_id } : r)
    })
  },

  createCustomer: async (payload) => {
    const supabase = createClient()
    const newCustomer = await customersApi.createCustomer(supabase, payload)
    set({ customers: [newCustomer, ...get().customers] })
    return newCustomer
  },

  createCustomerRequest: async (payload) => {
    const supabase = createClient()
    const newRequest = await customersApi.createCustomerRequest(supabase, payload)
    set({ customerRequests: [newRequest, ...get().customerRequests] })
    return newRequest
  },

  updateCustomerRequest: async (id, updates) => {
    const supabase = createClient()
    const updated = await customersApi.updateCustomerRequest(supabase, id, updates)
    set({
      customerRequests: get().customerRequests.map(r => r.id === id ? { ...r, ...updated } : r)
    })
  },

  requestApproval: async (payload) => {
    const supabase = createClient()
    const newApproval = await approvalsApi.requestApproval(supabase, payload)
    set({ approvals: [newApproval, ...get().approvals] })
    return newApproval
  },

  resolveApproval: async (id, status, comment) => {
    const supabase = createClient()
    const resolved = await approvalsApi.resolveApproval(supabase, id, status, comment)
    set({
      approvals: get().approvals.map(a => a.id === id ? { ...a, status, comment: comment || a.comment } : a)
    })
  },

  createTask: async (taskData) => {
    const { currentUser, tasks, workspaceTasks } = get()
    if (!currentUser) return

    const tempId = generateId()
    const optimisticTask: Task = {
      ...taskData,
      id: tempId,
      parentId: taskData.parentId || null,
      dependencies: [],
      blockedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Optimistic update
    set({ 
      tasks: [...tasks, optimisticTask],
      workspaceTasks: [...workspaceTasks, optimisticTask]
    })

    try {
      const supabase = createClient()
      const created = await taskApi.createTask(supabase, taskData.projectId, {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assigneeId: taskData.assignee?.id,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        userId: currentUser.id,
        parentId: taskData.parentId,
        workspaceId: taskData.workspaceId,
        taskType: taskData.taskType,
        reporterId: taskData.reporterId,
        customerId: taskData.customerId,
        requestId: taskData.requestId,
        approvalId: taskData.approvalId,
        documentId: taskData.documentId,
        estimatedHours: taskData.estimatedHours,
        storyPoints: taskData.storyPoints
      })

      // Replace temp task with real task
      set((state) => {
        const realtimeTaskExists = state.tasks.some(t => t.id === created.id);
        if (realtimeTaskExists) {
          // Realtime already inserted the task. Remove the temp one and enrich the realtime one.
          return {
            tasks: state.tasks.filter(t => t.id !== tempId).map(t => 
              t.id === created.id ? { ...t, assignee: taskData.assignee, labels: taskData.labels || [] } : t
            )
          }
        }
        // Realtime hasn't arrived yet
        return {
          tasks: state.tasks.map(t => t.id === tempId ? { ...t, id: created.id } : t),
          workspaceTasks: state.workspaceTasks.map(t => t.id === tempId ? { ...t, id: created.id } : t)
        }
      })

      // Log activity
      const { activeWorkspaceId } = get()
      if (activeWorkspaceId) {
        await activityApi.logActivity(supabase, activeWorkspaceId, currentUser.id, 'task', created.id, 'created', { targetName: taskData.title })
        get().fetchActivity() // refresh

        // Trigger Automations (Fire-and-forget, authoritative execution happens on server)
        fetch('/api/automations/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            event: 'TASK_CREATED',
            payload: { taskId: created.id, taskData: created }
          })
        }).catch(console.error)
      }
    } catch (err: unknown) {
      // Rollback
      set((state) => ({ 
        tasks: state.tasks.filter(t => t.id !== tempId),
        workspaceTasks: state.workspaceTasks.filter(t => t.id !== tempId)
      }))
      throw err
    }
  },

  updateTask: async (id, updates) => {
    const { tasks, workspaceTasks, currentUser, activeWorkspaceId } = get()
    
    // Optimistic update
    set({
      tasks: tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
      workspaceTasks: workspaceTasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    })

    try {
      const supabase = createClient()
      await taskApi.updateTask(supabase, id, {
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        assigneeId: updates.assignee?.id,
        startDate: updates.startDate,
        dueDate: updates.dueDate,
        parentId: updates.parentId,
        recurrenceRule: updates.recurrenceRule,
        taskType: updates.taskType,
        reporterId: updates.reporterId,
        customerId: updates.customerId,
        requestId: updates.requestId,
        approvalId: updates.approvalId,
        documentId: updates.documentId,
        estimatedHours: updates.estimatedHours,
        storyPoints: updates.storyPoints
      })

      if (activeWorkspaceId && currentUser) {
        await activityApi.logActivity(supabase, activeWorkspaceId, currentUser.id, 'task', id, 'updated', { targetName: updates.title || 'a task' })
        get().fetchActivity()

        // Trigger Automations
        fetch('/api/automations/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            event: 'TASK_UPDATED',
            payload: { taskId: id, changes: updates }
          })
        }).catch(console.error)
      }
    } catch (err: unknown) {
      // Rollback not implemented strictly here for brevity, but should reset to original
      throw err
    }
  },

  deleteTask: async (id) => {
    const { tasks, workspaceTasks } = get()
    const taskToDelete = tasks.find(t => t.id === id) || workspaceTasks.find(t => t.id === id)
    if (!taskToDelete) return

    // Optimistic update
    set({ 
      tasks: tasks.filter(t => t.id !== id),
      workspaceTasks: workspaceTasks.filter(t => t.id !== id)
    })

    try {
      const supabase = createClient()
      await taskApi.deleteTask(supabase, id)
    } catch (err: unknown) {
      set({ tasks, workspaceTasks }) // Rollback
      throw err
    }
  },

  bulkUpdateTasks: async (ids, updates) => {
    const { tasks, workspaceTasks, currentUser, activeWorkspaceId } = get()
    
    // Optimistic
    set({
      tasks: tasks.map(t => ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
      workspaceTasks: workspaceTasks.map(t => ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    })

    try {
      const supabase = createClient()
      await taskApi.bulkUpdateTasks(supabase, ids, { status: updates.status, priority: updates.priority })

      if (activeWorkspaceId && currentUser) {
        await activityApi.logActivity(supabase, activeWorkspaceId, currentUser.id, 'task', ids[0], 'updated', { targetName: `${ids.length} tasks` })
        get().fetchActivity()

        // Trigger Automations for each task
        ids.forEach(id => {
          fetch('/api/automations/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId: activeWorkspaceId,
              event: 'TASK_UPDATED',
              payload: { taskId: id, changes: updates }
            })
          }).catch(console.error)
        })
      }
    } catch (err) {
      throw err
    }
  },

  bulkDeleteTasks: async (ids) => {
    const { tasks, workspaceTasks } = get()
    set({ 
      tasks: tasks.filter(t => !ids.includes(t.id)),
      workspaceTasks: workspaceTasks.filter(t => !ids.includes(t.id))
    })
    try {
      const supabase = createClient()
      await taskApi.bulkDeleteTasks(supabase, ids)
    } catch (err) {
      set({ tasks, workspaceTasks })
      throw err
    }
  },

  moveTask: async (id, newStatus) => {
    const { tasks, currentUser, activeWorkspaceId } = get()
    const taskToMove = tasks.find(t => t.id === id)
    if (!taskToMove || taskToMove.status === newStatus) return

    // Optimistic update
    set({
      tasks: tasks.map(t => t.id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t)
    })

    try {
      const supabase = createClient()
      await taskApi.updateTask(supabase, id, { status: newStatus })

      if (activeWorkspaceId) {
        fetch('/api/automations/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            event: 'TASK_UPDATED',
            payload: { taskId: id, changes: { status: newStatus } }
          })
        }).catch(console.error)
      }

      if (activeWorkspaceId && currentUser) {
        await activityApi.logActivity(supabase, activeWorkspaceId, currentUser.id, 'task', id, 'moved', { targetName: taskToMove.title, toStatus: newStatus })
        get().fetchActivity()
      }
    } catch (err: unknown) {
      set({ tasks }) // Rollback
      throw err
    }
  },

  reorderTasks: async (reorderedTasks) => {
    const { tasks } = get()
    // Optimistic update: merge the reordered tasks back into the full list
    const reorderedMap = new Map(reorderedTasks.map(t => [t.id, t]))
    const newTasks = tasks.map(t => reorderedMap.get(t.id) || t)
    
    set({ tasks: newTasks })

    try {
      const supabase = createClient()
      const updates = reorderedTasks.map((t, index) => ({
        id: t.id,
        status: t.status,
        position: index,
        parentId: t.parentId
      }))
      await taskApi.updateTaskPositions(supabase, updates)
    } catch (err: unknown) {
      set({ tasks }) // Rollback
      throw err
    }
  },

  toggleWatcher: async (taskId: string, isWatching: boolean) => {
    const { currentUser, tasks, workspaceTasks } = get()
    if (!currentUser) return

    // Optimistic update
    const userId = currentUser.id
    const updateTaskWatchers = (task: import('@/types').Task) => {
      const watchers = task.watchers || []
      return {
        ...task,
        watchers: isWatching 
          ? watchers.filter(w => w.userId !== userId)
          : [...watchers, { userId }]
      }
    }
    
    set({
      tasks: tasks.map(t => t.id === taskId ? updateTaskWatchers(t) : t),
      workspaceTasks: workspaceTasks.map(t => t.id === taskId ? updateTaskWatchers(t) : t)
    })

    try {
      const supabase = createClient()
      await taskApi.toggleWatcher(supabase, taskId, userId, isWatching)
    } catch (err) {
      console.error('Failed to toggle watcher:', err)
      // Rollback
      set({ tasks, workspaceTasks })
      throw err
    }
  },

  addDependency: async (taskId, dependsOnTaskId, type = 'blocking') => {
    const { currentUser } = get()
    if (!currentUser) return

    try {
      const supabase = createClient()
      const created = await taskApi.addDependency(supabase, taskId, dependsOnTaskId, type, currentUser.id)
      
      set((state) => {
        const newDep = {
          id: created.id,
          taskId: created.task_id,
          dependsOnTaskId: created.depends_on_task_id,
          type: created.type as import('@/types').TaskDependencyType,
          createdAt: created.created_at
        }
        
        return {
          tasks: state.tasks.map(t => {
            if (t.id === taskId) {
              return { ...t, dependencies: [...(t.dependencies || []), newDep] }
            }
            if (t.id === dependsOnTaskId) {
              return { ...t, blockedBy: [...(t.blockedBy || []), newDep] }
            }
            return t
          })
        }
      })
    } catch (err) {
      console.error('Failed to add dependency:', err)
      throw err
    }
  },

  removeDependency: async (dependencyId) => {
    set((state) => ({
      tasks: state.tasks.map(t => ({
        ...t,
        dependencies: (t.dependencies || []).filter(d => d.id !== dependencyId),
        blockedBy: (t.blockedBy || []).filter(d => d.id !== dependencyId)
      }))
    }))

    try {
      const supabase = createClient()
      await taskApi.removeDependency(supabase, dependencyId)
    } catch (err) {
      console.error('Failed to remove dependency:', err)
      throw err
    }
  },

  addAttachment: async (file, taskId) => {
    const { currentUser, activeWorkspaceId } = get()
    if (!currentUser || !activeWorkspaceId) return

    try {
      const supabase = createClient()
      const newAttachment = await taskApi.uploadAttachment(supabase, taskId, activeWorkspaceId, currentUser.id, file)
      
      set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, attachments: [...(t.attachments || []), newAttachment] }
          }
          return t
        })
      }))
    } catch (err) {
      console.error('Failed to upload attachment:', err)
      throw err
    }
  },

  removeAttachment: async (attachmentId, storagePath) => {
    set((state) => ({
      tasks: state.tasks.map(t => ({
        ...t,
        attachments: (t.attachments || []).filter(a => a.id !== attachmentId)
      }))
    }))

    try {
      const supabase = createClient()
      await taskApi.deleteAttachment(supabase, attachmentId, storagePath)
    } catch (err) {
      console.error('Failed to remove attachment:', err)
      throw err
    }
  },

  createMilestone: async (projectId, payload) => {
    const { activeWorkspaceId, milestones } = get()
    if (!activeWorkspaceId) return
    try {
      const supabase = createClient()
      const newMilestone = await milestonesApi.createMilestone(
        supabase,
        activeWorkspaceId,
        projectId,
        payload
      )
      set({ milestones: [...milestones, newMilestone] })
    } catch (error: any) {
      toast.error(error.message || "Failed to create milestone")
    }
  },

  updateMilestone: async (id, updates) => {
    const { milestones } = get()
    try {
      const supabase = createClient()
      const updated = await milestonesApi.updateMilestone(supabase, id, updates as any)
      set({ milestones: milestones.map(m => m.id === id ? updated as any : m) })
    } catch (error: any) {
      toast.error(error.message || "Failed to update milestone")
    }
  },

  fetchViews: async () => {
    // Optional placeholder implementation if not deeply integrated
  },


  deleteMilestone: async (id) => {
    const { milestones } = get()
    try {
      const supabase = createClient()
      await milestonesApi.deleteMilestone(supabase, id)
      set({ milestones: milestones.filter(m => m.id !== id) })
    } catch (error: any) {
      toast.error(error.message || "Failed to delete milestone")
    }
  },

  saveFilter: async (name, filterData) => {
    const { activeWorkspaceId, currentUser, savedFilters } = get()
    if (!activeWorkspaceId || !currentUser) return
    try {
      const supabase = createClient()
      const newFilter = await filtersApi.saveFilter(supabase, activeWorkspaceId, currentUser.id, name, filterData)
      set({ savedFilters: [...savedFilters, newFilter] })
      toast.success("Filter saved")
    } catch (error: any) {
      toast.error(error.message || "Failed to save filter")
    }
  },

  deleteFilter: async (id) => {
    const { savedFilters } = get()
    try {
      const supabase = createClient()
      await filtersApi.deleteFilter(supabase, id)
      set({ savedFilters: savedFilters.filter(f => f.id !== id) })
      toast.success("Filter deleted")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete filter")
    }
  },

  createAutomation: async (payload) => {
    const { activeWorkspaceId, currentUser, automations } = get()
    if (!activeWorkspaceId || !currentUser) return
    try {
      const supabase = createClient()
      const newAutomation = await automationsApi.createAutomation(supabase, {
        workspace_id: activeWorkspaceId,
        created_by: currentUser.id,
        ...payload
      })
      set({ automations: [newAutomation, ...automations] })
      toast.success("Automation rule created")
    } catch (error: any) {
      toast.error(error.message || "Failed to create automation")
      throw error
    }
  },

  updateAutomation: async (id, updates) => {
    const { automations } = get()
    try {
      const supabase = createClient()
      const updated = await automationsApi.updateAutomation(supabase, id, updates)
      set({ automations: automations.map(a => a.id === id ? { ...a, ...updated } : a) })
    } catch (error: any) {
      toast.error("Failed to update automation")
      throw error
    }
  },

  deleteAutomation: async (id) => {
    const { automations } = get()
    // Optimistic
    set({ automations: automations.filter(a => a.id !== id) })
    try {
      const supabase = createClient()
      await automationsApi.deleteAutomation(supabase, id)
      toast.success("Automation rule deleted")
    } catch (error: any) {
      set({ automations })
      toast.error("Failed to delete automation")
      throw error
    }
  },

  toggleAutomation: async (id, isActive) => {
    const { automations } = get()
    // Optimistic
    set({ automations: automations.map(a => a.id === id ? { ...a, is_active: isActive } : a) })
    try {
      const supabase = createClient()
      await automationsApi.updateAutomation(supabase, id, { is_active: isActive })
      toast.success(isActive ? "Automation activated" : "Automation paused")
    } catch (error: any) {
      set({ automations })
      toast.error("Failed to update automation status")
      throw error
    }
  },

  createProject: async (projectData) => {
    const { currentUser, activeWorkspaceId, projects } = get()
    if (!currentUser || !activeWorkspaceId) throw new Error("Missing workspace or user")

    const tempId = generateId()
    const optimisticProject: Project = {
      ...projectData,
      id: tempId,
      taskCount: 0,
      progress: 0,
      members: [],
      taskTypes: projectData.taskTypes || ['Task'],
      updatedAt: new Date().toISOString(),
    }

    set({ projects: [optimisticProject, ...projects] })

    try {
      const supabase = createClient()
      const created = await projectApi.createProject(supabase, activeWorkspaceId, {
        name: projectData.name,
        description: projectData.description,
        icon: projectData.icon,
        color: projectData.color,
        status: projectData.status,
        userId: currentUser.id
      })

      set((state) => ({
        projects: state.projects.map(p => p.id === tempId ? { ...p, id: created.id } : p)
      }))

      await activityApi.logActivity(supabase, activeWorkspaceId, currentUser.id, 'project', created.id, 'created', { targetName: projectData.name })
      get().fetchActivity()
      return created.id
    } catch (err: unknown) {
      set((state) => ({ projects: state.projects.filter(p => p.id !== tempId) }))
      throw err
    }
  },

  createProjectFromTemplate: async (templateId, projectData) => {
    const { activeWorkspaceId, currentUser } = get()
    if (!activeWorkspaceId || !currentUser) throw new Error("No active workspace or user")

    try {
      const supabase = createClient()
      const newProject = await apiCreateProjectFromTemplate(
        supabase,
        templateId,
        activeWorkspaceId,
        {
          name: projectData.name,
          description: projectData.description,
          icon: projectData.icon,
          color: projectData.color,
          userId: currentUser.id,
          includeSampleData: projectData.includeSampleData
        }
      )
      
      // Add the new project to the local state
      set((state) => ({
        projects: [{
          id: newProject.id,
          name: newProject.name,
          description: newProject.description || '',
          icon: newProject.icon || undefined,
          color: newProject.color || undefined,
          status: (newProject.status as any) || 'Active',
          progress: 0,
          taskCount: 0,
          members: [], // default members empty for now, could be passed
          taskTypes: newProject.task_types || ['Task'],
          updatedAt: newProject.updated_at || new Date().toISOString()
        }, ...state.projects]
      }))

      return newProject.id
    } catch (err: unknown) {
      console.error("Failed to create project from template:", err)
      throw err
    }
  },

  updateProject: async (id, updates) => {
    const { projects } = get()
    
    set({
      projects: projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
    })

    try {
      const supabase = createClient()
      await projectApi.updateProject(supabase, id, {
        name: updates.name,
        description: updates.description,
        icon: updates.icon,
        color: updates.color,
        status: updates.status,
      })
    } catch (err: unknown) {
      throw err
    }
  },

  deleteProject: async (id) => {
    try {
      const supabase = createClient()
      await projectApi.deleteProject(supabase, id)
      
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        tasks: state.tasks.filter(t => t.projectId !== id), // Also remove associated tasks locally
        workspaceTasks: state.workspaceTasks.filter(t => t.projectId !== id)
      }))
    } catch (err: unknown) {
      console.error('Failed to delete project', err)
      throw err
    }
  },

  // Realtime Receivers
  applyRealtimeProjectInsert: (payload) => {
    set((state) => {
      if (state.projects.some(p => p.id === payload.id)) return state
      const newProject: Project = {
        id: payload.id,
        name: payload.name,
        description: payload.description || "",
        icon: payload.icon || undefined,
        color: payload.color || "bg-blue-500",
        status: payload.status || "Active",
        progress: 0,
        taskCount: 0,
        members: [],
        updatedAt: payload.updated_at || new Date().toISOString(),
        templateId: payload.template_id || undefined,
        taskTypes: payload.task_types || undefined
      }
      return { projects: [newProject, ...state.projects] }
    })
  },
  applyRealtimeProjectUpdate: (payload) => {
    set((state) => {
      const existing = state.projects.find(p => p.id === payload.id)
      if (!existing) return state
      const updatedProject = {
        ...existing,
        name: payload.name ?? existing.name,
        description: payload.description ?? existing.description,
        icon: payload.icon ?? existing.icon,
        color: payload.color ?? existing.color,
        status: payload.status ?? existing.status,
        updatedAt: payload.updated_at ?? new Date().toISOString(),
        templateId: payload.template_id ?? existing.templateId,
        taskTypes: payload.task_types ?? existing.taskTypes
      }
      return { projects: state.projects.map(p => p.id === payload.id ? updatedProject : p) }
    })
  },
  applyRealtimeProjectDelete: (payload) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== payload.id),
      tasks: state.tasks.filter(t => t.projectId !== payload.id),
      workspaceTasks: state.workspaceTasks.filter(t => t.projectId !== payload.id)
    }))
  },

  applyRealtimeTaskUpdate: (payload) => {
    set((state) => {
      const existing = state.tasks.find(t => t.id === payload.id)
      if (!existing) return state
      
      // Basic deduplication: if the updated_at from the payload is not newer, ignore it
      if (new Date(payload.updated_at).getTime() <= new Date(existing.updatedAt).getTime()) {
        return state
      }

      const updatedTask = {
        ...existing,
        title: payload.title ?? existing.title,
        description: payload.description ?? existing.description,
        status: payload.status ?? existing.status,
        priority: payload.priority ?? existing.priority,
        position: payload.position ?? existing.position,
        parentId: payload.parent_id !== undefined ? payload.parent_id : existing.parentId,
        recurrenceRule: payload.recurrence_rule !== undefined ? payload.recurrence_rule : existing.recurrenceRule,
        isRecurring: payload.is_recurring !== undefined ? payload.is_recurring : existing.isRecurring,
        nextOccurrence: payload.next_occurrence !== undefined ? payload.next_occurrence : existing.nextOccurrence,
        recurringParentId: payload.recurring_parent_id !== undefined ? payload.recurring_parent_id : existing.recurringParentId,
        dueDate: payload.due_date !== undefined ? payload.due_date : existing.dueDate,
        assignee: payload.assignee_id !== undefined ? (payload.assignee_id ? { id: payload.assignee_id } as User : undefined) : existing.assignee,
        updatedAt: payload.updated_at
      }

      return {
        tasks: state.tasks.map(t => t.id === payload.id ? updatedTask : t),
        workspaceTasks: state.workspaceTasks.map(t => t.id === payload.id ? updatedTask : t)
      }
    })
  },

  applyRealtimeTaskInsert: (payload) => {
    set((state) => {
      // Check if it already exists (e.g. from an optimistic insert that finally resolved, although our create logic replaces tempId)
      if (state.tasks.some(t => t.id === payload.id)) return state

      const newTask: Task = {
        id: payload.id,
        projectId: payload.project_id,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        position: payload.position,
        parentId: payload.parent_id || null,
        recurrenceRule: payload.recurrence_rule || null,
        isRecurring: payload.is_recurring || false,
        nextOccurrence: payload.next_occurrence || null,
        recurringParentId: payload.recurring_parent_id || null,
        dueDate: payload.due_date,
        assignee: payload.assignee_id ? { id: payload.assignee_id } as User : undefined,
        dependencies: [],
        blockedBy: [],
        attachments: [],
        createdAt: payload.created_at,
        updatedAt: payload.updated_at
      }

      return {
        tasks: [...state.tasks, newTask].sort((a, b) => a.position - b.position),
        workspaceTasks: [...state.workspaceTasks, newTask].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      }
    })
  },

  applyRealtimeTaskDelete: (payload) => {
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== payload.id),
      workspaceTasks: state.workspaceTasks.filter(t => t.id !== payload.id)
    }))
  },

  applyRealtimeMilestoneInsert: (payload) => {
    set((state) => {
      if (state.milestones.some(m => m.id === payload.id)) return state
      const newMilestone: import('@/types').Milestone = {
        id: payload.id,
        projectId: payload.project_id,
        workspaceId: payload.workspace_id,
        name: payload.name,
        dueDate: payload.due_date || payload.date,
        status: payload.status,
        createdAt: payload.created_at,
        updatedAt: payload.updated_at,
      }
      return { milestones: [...state.milestones, newMilestone].sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()) }
    })
  },

  applyRealtimeMilestoneUpdate: (payload) => {
    set((state) => {
      const existing = state.milestones.find(m => m.id === payload.id)
      if (!existing) return state
      const updatedMilestone = {
        ...existing,
        name: payload.name ?? existing.name,
        dueDate: payload.due_date ?? payload.date ?? existing.dueDate,
        status: payload.status ?? existing.status,
      }
      return { milestones: state.milestones.map(m => m.id === payload.id ? updatedMilestone : m).sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime()) }
    })
  },

  applyRealtimeMilestoneDelete: (payload) => {
    set((state) => ({
      milestones: state.milestones.filter(m => m.id !== payload.id)
    }))
  },


  applyRealtimeNotification: (payload: any) => {
    const { notifications, unreadNotificationCount } = get()
    
    // Check if we need to hydrate missing relation info (like actor details)
    // For now we'll push the raw payload and it will lack nested relations until re-fetched,
    // or we can structure the payload appropriately
    set({
      notifications: [payload.new, ...notifications],
      unreadNotificationCount: unreadNotificationCount + 1
    })
  }
}))

export const useIsAdminOrOwner = () => useDataStore(state => state.currentUser?.role === 'admin' || state.currentUser?.role === 'owner')

