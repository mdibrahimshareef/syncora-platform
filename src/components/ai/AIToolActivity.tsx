import React from 'react'
import { Loader2, CheckCircle2, XCircle, Search, Database, Clock, Calendar, CheckCircle, FileText, BarChart3, AlertTriangle, Users, Layers, AlertCircle } from 'lucide-react'

export interface AIToolActivityProps {
  toolName: string
  state: string
}

export function AIToolActivity({ toolName, state }: AIToolActivityProps) {
  const isRunning = state === 'partial-call' || state === 'call'
  const isCompleted = state === 'result' || state === 'output-available' || state === 'executed' || state === 'already_executed'
  const isError = state === 'output-error' || state === 'failed' || state === 'denied'
  const isConflict = state === 'conflict'
  
  if (state === 'input-available') return null // handled by ActionProposalCard

  let Icon = Search
  let runningLabel = 'Investigating...'
  let completedLabel = 'Completed'

  switch (toolName) {
    case 'search_tasks':
      Icon = Search
      runningLabel = 'Searching tasks...'
      completedLabel = 'Tasks analyzed'
      break
    case 'get_overdue_tasks':
      Icon = Clock
      runningLabel = 'Checking overdue deadlines...'
      completedLabel = 'Overdue tasks checked'
      break
    case 'get_projects':
      Icon = Layers
      runningLabel = 'Loading projects...'
      completedLabel = 'Projects retrieved'
      break
    case 'get_project':
      Icon = Layers
      runningLabel = 'Fetching project context...'
      completedLabel = 'Project context loaded'
      break
    case 'get_workspace_insights':
      Icon = BarChart3
      runningLabel = 'Scanning workspace insights...'
      completedLabel = 'Executive signals gathered'
      break
    case 'get_team_members':
      Icon = Users
      runningLabel = 'Checking team roster...'
      completedLabel = 'Team roster loaded'
      break
    case 'search_knowledge':
      Icon = Database
      runningLabel = 'Searching knowledge base...'
      completedLabel = 'Knowledge base consulted'
      break
    case 'get_project_health':
      Icon = BarChart3
      runningLabel = 'Evaluating project health...'
      completedLabel = 'Project health evaluated'
      break
    case 'get_timesheet':
      Icon = Clock
      runningLabel = 'Checking time entries...'
      completedLabel = 'Time entries reviewed'
      break
    case 'get_workload':
      Icon = Calendar
      runningLabel = 'Analyzing team workload...'
      completedLabel = 'Workload analyzed'
      break
    case 'create_task':
    case 'update_task':
    case 'assign_task':
      Icon = CheckCircle
      runningLabel = 'Drafting action proposal...'
      completedLabel = 'Action proposal prepared'
      break
    default:
      Icon = FileText
      runningLabel = `Running ${toolName.replace(/_/g, ' ')}...`
      completedLabel = toolName.replace(/^(get_|search_)/, '').replace(/_/g, ' ')
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] py-1 px-2.5 rounded-md bg-muted/50 border border-border/70 shadow-2xs transition-all hover:bg-muted/80">
      {isRunning && <Loader2 className="h-3 w-3 animate-spin text-indigo-500 shrink-0" />}
      {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />}
      {isConflict && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
      {isError && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
      
      <span className={isRunning ? 'text-indigo-600 dark:text-indigo-400 font-medium' : isConflict ? 'text-amber-600 dark:text-amber-400 font-medium' : isError ? 'text-destructive font-medium' : 'text-muted-foreground capitalize'}>
        {isRunning ? runningLabel : isConflict ? `Conflict: ${toolName}` : isError ? `Error: ${toolName}` : completedLabel}
      </span>
    </div>
  )
}
