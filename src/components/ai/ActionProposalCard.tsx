import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, CheckSquare, Edit, UserPlus } from 'lucide-react'

export interface ActionProposalCardProps {
  toolName: string;
  args: any;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function ActionProposalCard({ toolName, args, onConfirm, onCancel, isExecuting }: ActionProposalCardProps) {
  const renderCardContent = () => {
    switch (toolName) {
      case 'create_task':
        return (
          <>
            <div className='font-medium text-base mb-2'>{args.title}</div>
            <div className='grid grid-cols-[100px_1fr] gap-2 items-start'>
              <span className='text-muted-foreground text-xs'>Project:</span>
              <span className='font-medium text-xs truncate'>{args.projectId || 'Default Project'}</span>
            </div>
            {args.assigneeId && (
              <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
                <span className='text-muted-foreground text-xs'>Assignee:</span>
                <span className='font-medium text-xs truncate'>{args.assigneeId}</span>
              </div>
            )}
            {args.priority && (
              <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
                <span className='text-muted-foreground text-xs'>Priority:</span>
                <span className='font-medium text-xs'>{args.priority}</span>
              </div>
            )}
            {args.dueDate && (
              <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
                <span className='text-muted-foreground text-xs'>Due Date:</span>
                <span className='font-medium text-xs'>{args.dueDate}</span>
              </div>
            )}
            {args.reason && (
              <div className='mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                <span className='font-medium block mb-1'>Reason:</span>
                {args.reason}
              </div>
            )}
          </>
        )
      case 'update_task':
        return (
          <>
            <div className='font-medium text-sm mb-2'>Task ID: {args.taskId}</div>
            {args.updates?.title && (
              <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
                <span className='text-muted-foreground text-xs'>New Title:</span>
                <span className='font-medium text-xs'>{args.updates.title}</span>
              </div>
            )}
            {args.updates?.status && (
              <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
                <span className='text-muted-foreground text-xs'>New Status:</span>
                <span className='font-medium text-xs'>{args.updates.status}</span>
              </div>
            )}
            {args.reason && (
              <div className='mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                <span className='font-medium block mb-1'>Reason:</span>
                {args.reason}
              </div>
            )}
          </>
        )
      case 'assign_task':
        return (
          <>
            <div className='font-medium text-sm mb-2'>Task ID: {args.taskId}</div>
            <div className='grid grid-cols-[100px_1fr] gap-2 items-start mt-1'>
              <span className='text-muted-foreground text-xs'>New Assignee:</span>
              <span className='font-medium text-xs truncate'>{args.assigneeId}</span>
            </div>
            {args.reason && (
              <div className='mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                <span className='font-medium block mb-1'>Reason:</span>
                {args.reason}
              </div>
            )}
          </>
        )
      default:
        // Fallback for unexpected actions
        return (
          <div className='text-sm space-y-2'>
            {Object.entries(args).map(([key, value]) => {
              if (key === 'reason' && typeof value === 'string') {
                return (
                   <div key={key} className='mt-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                    <span className='font-medium block mb-1'>Reason:</span>
                    {value}
                  </div>
                )
              }
              const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
              return (
                <div key={key} className='grid grid-cols-[100px_1fr] gap-2 items-start'>
                  <span className='text-muted-foreground text-xs capitalize'>{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className='font-medium text-xs break-words'>{strVal}</span>
                </div>
              )
            })}
          </div>
        )
    }
  }

  const getActionDetails = () => {
    switch (toolName) {
      case 'create_task': return { title: 'Create task', Icon: CheckSquare }
      case 'update_task': return { title: 'Update task', Icon: Edit }
      case 'assign_task': return { title: 'Assign task', Icon: UserPlus }
      default: return { title: `Action: ${toolName.replace(/_/g, ' ')}`, Icon: CheckSquare }
    }
  }

  const { title, Icon } = getActionDetails()

  return (
    <Card className='border-indigo-200 dark:border-indigo-900 shadow-sm w-full max-w-sm my-2'>
      <CardHeader className='bg-indigo-50/50 dark:bg-indigo-950/20 py-2.5 border-b'>
        <CardTitle className='text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400'>
          <Icon className='h-4 w-4' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-3 pb-2'>
        <div className='text-sm'>
          {renderCardContent()}
        </div>
      </CardContent>
      <CardFooter className='flex justify-end gap-2 pt-2 pb-3'>
        <Button variant='outline' size='sm' onClick={onCancel} disabled={isExecuting} className="h-8">
          <X className='h-3 w-3 mr-1' /> Cancel
        </Button>
        <Button variant='default' size='sm' onClick={onConfirm} disabled={isExecuting} className='bg-indigo-600 hover:bg-indigo-700 text-white h-8'>
          <Check className='h-3 w-3 mr-1' /> {title}
        </Button>
      </CardFooter>
    </Card>
  )
}
