import React from 'react'
import { Loader2, Check, X, Search, Database, Clock, Calendar, CheckCircle2, FileText, BarChart3 } from 'lucide-react'

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
  let runningLabel = 'Running...'
  let completedLabel = 'Completed'

  switch (toolName) {
    case 'search_tasks':
      Icon = Search
      runningLabel = 'Searching tasks'
      completedLabel = 'Searched tasks'
      break
    case 'search_knowledge':
      Icon = Database
      runningLabel = 'Searching knowledge base'
      completedLabel = 'Searched knowledge base'
      break
    case 'get_project_health':
      Icon = BarChart3
      runningLabel = 'Checking project health'
      completedLabel = 'Reviewed project health'
      break
    case 'get_timesheet':
      Icon = Clock
      runningLabel = 'Checking time entries'
      completedLabel = 'Reviewed time entries'
      break
    case 'get_workload':
      Icon = Calendar
      runningLabel = 'Analyzing workload'
      completedLabel = 'Analyzed workload'
      break
    case 'create_task':
    case 'update_task':
    case 'assign_task':
      Icon = CheckCircle2
      runningLabel = 'Preparing action proposal'
      completedLabel = 'Prepared action proposal'
      break
    default:
      Icon = FileText
      runningLabel = `Running ${toolName.replace(/_/g, ' ')}`
      completedLabel = `Completed ${toolName.replace(/_/g, ' ')}`
  }

  return (
    <div className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-full bg-muted/30 border border-muted-foreground/20 shadow-sm w-fit my-1">
      {isRunning && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
      {isCompleted && <Check className="h-3 w-3 text-green-500" />}
      {isConflict && <X className="h-3 w-3 text-amber-500" />}
      {isError && <X className="h-3 w-3 text-destructive" />}
      
      <span className={isRunning ? 'text-indigo-600 dark:text-indigo-400 font-medium' : isConflict ? 'text-amber-600 dark:text-amber-400 font-medium' : isError ? 'text-destructive font-medium' : 'text-muted-foreground'}>
        {isRunning ? runningLabel : isConflict ? `Conflict during ${toolName}` : isError ? `Failed to run ${toolName}` : completedLabel}
      </span>
    </div>
  )
}
