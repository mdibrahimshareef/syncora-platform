import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, ShieldAlert, ShieldCheck, Shield, Activity, RefreshCw, AlertCircle, PlayCircle } from 'lucide-react'
import { WorkflowPlan } from '@/lib/ai/workflow-schema'
import { calculatePlanRisk } from '@/lib/ai/risk'
import { createClient } from '@/lib/supabase/client'

export interface WorkflowPlanCardProps {
  plan: WorkflowPlan;
  result?: any;
  workspaceId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WorkflowPlanCard({ plan, result, workspaceId, onConfirm, onCancel }: WorkflowPlanCardProps) {
  const risk = calculatePlanRisk(plan);
  const [events, setEvents] = useState<any[]>([])
  const [currentWorkflowStatus, setCurrentWorkflowStatus] = useState<string>('AWAITING_APPROVAL')
  const [isActionPending, setIsActionPending] = useState(false)
  const supabase: any = createClient()
  const planId = plan.workflowId || 'pending' // Usually we pass workflowId, but the LLM might not generate it until execution

  // Effect to subscribe to realtime events
  useEffect(() => {
    if (!workspaceId || !plan.workflowId) return

    // Immediately fetch existing events to reconcile
    supabase.from('ai_workflow_events')
      .select('*')
      .eq('workflow_id', plan.workflowId)
      .eq('workspace_id', workspaceId)
      .order('sequence', { ascending: true })
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          setEvents(data)
          const latestEvent = data[data.length - 1]
          if (['WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_PARTIALLY_COMPLETED', 'WORKFLOW_PAUSED'].includes(latestEvent.event_type)) {
            setCurrentWorkflowStatus(latestEvent.status)
          }
        }
      })

    // Subscribe to new events
    const channel = supabase.channel(`workflow_${plan.workflowId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_workflow_events',
          filter: `workflow_id=eq.${plan.workflowId}`
        },
        (payload: any) => {
          // Reconcile and append event
          setEvents((prev) => {
            // Ignore duplicates based on sequence or id
            if (prev.some(e => e.id === payload.new.id)) return prev
            const nextEvents = [...prev, payload.new].sort((a, b) => a.sequence - b.sequence)
            
            // Update overall status if applicable
            const latest = nextEvents[nextEvents.length - 1]
            if (['WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_PARTIALLY_COMPLETED', 'WORKFLOW_PAUSED'].includes(latest.event_type)) {
              setCurrentWorkflowStatus(latest.status)
            }
            return nextEvents
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, plan.workflowId, supabase])

  // Derive status from result if event stream is empty (fallback)
  useEffect(() => {
    if (result && events.length === 0) {
      setCurrentWorkflowStatus(result.status || 'COMPLETED')
    }
  }, [result, events.length])

  const getRiskColor = () => {
    switch(risk) {
      case 'LOW': return 'text-green-600 bg-green-50 dark:bg-green-950/20 border-green-200';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200';
      case 'HIGH': return 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200';
      default: return '';
    }
  }

  const RiskIcon = risk === 'LOW' ? ShieldCheck : (risk === 'HIGH' ? ShieldAlert : Shield)

  const isExecuting = currentWorkflowStatus === 'EXECUTING' || (events.length > 0 && currentWorkflowStatus !== 'COMPLETED' && currentWorkflowStatus !== 'PARTIALLY_COMPLETED' && currentWorkflowStatus !== 'FAILED' && currentWorkflowStatus !== 'VERIFICATION_FAILED')
  const isFinished = ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'VERIFICATION_FAILED', 'CANCELLED'].includes(currentWorkflowStatus)

  // Compute step statuses based on event stream
  const stepStatuses = useMemo(() => {
    const statuses: Record<string, { status: string, error?: string }> = {}
    plan.steps.forEach(s => { statuses[s.stepId] = { status: 'PENDING' } })
    
    events.forEach(e => {
      if (e.step_id && statuses[e.step_id]) {
        if (e.event_type === 'STEP_STARTED') statuses[e.step_id] = { status: 'EXECUTING' }
        else if (e.event_type === 'STEP_COMPLETED') statuses[e.step_id] = { status: 'COMPLETED' }
        else if (e.event_type === 'STEP_SKIPPED') statuses[e.step_id] = { status: 'SKIPPED' }
        else if (e.event_type === 'STEP_FAILED') statuses[e.step_id] = { status: 'FAILED', error: e.metadata?.error }
        else if (e.event_type === 'STEP_VERIFIED' && e.status === 'VERIFICATION_FAILED') statuses[e.step_id] = { status: 'VERIFICATION_FAILED', error: e.metadata?.error }
      }
    })
    
    // Fallback using `result` if events missed
    if (result && result.completedSteps) {
      result.completedSteps.forEach((stepId: string) => {
        if (statuses[stepId]?.status === 'PENDING') statuses[stepId] = { status: 'COMPLETED' }
      })
      if (result.failedStep) {
        statuses[result.failedStep] = { status: result.status, error: result.error }
      }
    }
    
    return statuses
  }, [events, plan.steps, result])

  const renderStepStatus = (stepId: string) => {
    const s = stepStatuses[stepId]
    if (s.status === 'COMPLETED') return <div className="text-green-600 flex items-center text-xs"><Check className="w-3 h-3 mr-1"/> Completed</div>
    if (s.status === 'SKIPPED') return <div className="text-gray-500 flex items-center text-xs"><Check className="w-3 h-3 mr-1"/> Skipped (Already done)</div>
    if (s.status === 'EXECUTING') return <div className="text-blue-500 flex items-center text-xs"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> Executing...</div>
    if (s.status === 'FAILED' || s.status === 'VERIFICATION_FAILED') return <div className="text-red-500 flex items-center text-xs"><X className="w-3 h-3 mr-1"/> Failed: {s.error}</div>
    return <div className="text-gray-400 flex items-center text-xs">Pending</div>
  }

  const completedCount = Object.values(stepStatuses).filter(s => s.status === 'COMPLETED' || s.status === 'SKIPPED').length

  const failedStepId = Object.keys(stepStatuses).find(id => stepStatuses[id].status === 'FAILED' || stepStatuses[id].status === 'VERIFICATION_FAILED');

  const handleResume = async () => {
    if (!workspaceId || !plan.workflowId) return;
    setIsActionPending(true);
    try {
      await fetch('/api/ai/action/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, workflowId: plan.workflowId })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  }

  const handleRetry = async () => {
    if (!workspaceId || !plan.workflowId || !failedStepId) return;
    setIsActionPending(true);
    try {
      await fetch('/api/ai/action/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, workflowId: plan.workflowId, stepId: failedStepId })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  }

  const handleLiveCancel = async () => {
    if (!workspaceId || !plan.workflowId) {
      onCancel(); // fallback to static cancel if not executing yet
      return;
    }
    setIsActionPending(true);
    try {
      await fetch('/api/ai/action/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, workflowId: plan.workflowId })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  }

  return (
    <Card className='border-indigo-200 dark:border-indigo-900 shadow-sm w-full max-w-sm my-2'>
      <CardHeader className='bg-indigo-50/50 dark:bg-indigo-950/20 py-2.5 border-b'>
        <CardTitle className='text-sm font-medium flex items-center justify-between text-indigo-700 dark:text-indigo-400'>
          <span className="flex items-center gap-2">
             {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
             Workflow: {plan.title || 'Agent Plan'}
          </span>
          {isFinished && <span className="text-xs font-normal px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 rounded">{currentWorkflowStatus}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-3 pb-2'>
        <div className='text-sm text-muted-foreground mb-3'>
          {plan.description}
        </div>
        
        {(!isExecuting && !isFinished) && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs border ${getRiskColor()} mb-3`}>
             <RiskIcon className='h-3 w-3' />
             <span className='font-medium'>Risk Level: {risk}</span>
             {risk !== 'LOW' && <span className='ml-auto'>Requires Approval</span>}
          </div>
        )}

        {(isExecuting || isFinished) && (
          <div className="mb-3">
             <div className="flex justify-between text-xs mb-1 text-muted-foreground">
               <span>Progress</span>
               <span>{completedCount} / {plan.steps.length} steps</span>
             </div>
             <div className="w-full bg-secondary rounded-full h-1.5">
               <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(completedCount / plan.steps.length) * 100}%` }}></div>
             </div>
          </div>
        )}

        <div className='space-y-2'>
          {plan.steps.map((step, idx) => {
            const isActive = stepStatuses[step.stepId]?.status === 'EXECUTING'
            const isFailed = stepStatuses[step.stepId]?.status === 'FAILED' || stepStatuses[step.stepId]?.status === 'VERIFICATION_FAILED'
            
            return (
              <div key={step.stepId} className={`border rounded p-2 text-xs transition-colors ${isActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''} ${isFailed ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}`}>
                <div className='flex justify-between items-start mb-1'>
                  <div className='font-medium'>Step {idx + 1}: {step.tool.replace(/_/g, ' ')}</div>
                  {renderStepStatus(step.stepId)}
                </div>
                {!isExecuting && !isFinished && (
                  <div className='text-muted-foreground line-clamp-1 truncate'>
                     Args: {JSON.stringify(step.args)}
                  </div>
                )}
                {isFailed && stepStatuses[step.stepId]?.error && (
                  <div className='text-red-600 dark:text-red-400 mt-1 flex items-start gap-1'>
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="break-words">{stepStatuses[step.stepId].error}</span>
                  </div>
                )}
                {step.dependsOn && step.dependsOn.length > 0 && !isFinished && (
                  <div className='text-xs text-indigo-500 mt-1'>
                    Depends on: {step.dependsOn.join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
      
      {!isExecuting && !isFinished && (
        <CardFooter className='flex justify-end gap-2 pt-2 pb-3 border-t bg-muted/20'>
          <Button variant='outline' size='sm' onClick={handleLiveCancel} disabled={isActionPending} className="h-8">
            <X className='h-3 w-3 mr-1' /> Cancel
          </Button>
          <Button variant='default' size='sm' onClick={onConfirm} disabled={isActionPending} className='bg-indigo-600 hover:bg-indigo-700 text-white h-8'>
            <Check className='h-3 w-3 mr-1' /> Approve Plan
          </Button>
        </CardFooter>
      )}

      {isExecuting && (
        <CardFooter className='flex justify-end gap-2 pt-2 pb-3 border-t bg-muted/20'>
          <Button variant='outline' size='sm' onClick={handleLiveCancel} disabled={isActionPending} className="h-8">
            <X className='h-3 w-3 mr-1' /> Cancel Execution
          </Button>
        </CardFooter>
      )}

      {isFinished && currentWorkflowStatus !== 'COMPLETED' && currentWorkflowStatus !== 'CANCELLED' && (
        <CardFooter className='flex justify-end gap-2 pt-2 pb-3 border-t bg-muted/20'>
           <Button variant='outline' size='sm' onClick={handleRetry} disabled={isActionPending || !failedStepId} className="h-8">
             <RefreshCw className={`h-3 w-3 mr-1 ${isActionPending ? 'animate-spin' : ''}`} /> Retry Failed Step
           </Button>
           <Button variant='default' size='sm' onClick={handleResume} disabled={isActionPending} className='h-8'>
             <PlayCircle className='h-3 w-3 mr-1' /> Resume Workflow
           </Button>
        </CardFooter>
      )}
    </Card>
  )
}
