import React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, AlertTriangle } from 'lucide-react'

export interface ActionProposalCardProps {
  toolName: string;
  args: any;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function ActionProposalCard({ toolName, args, onConfirm, onCancel, isExecuting }: ActionProposalCardProps) {
  
  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' ').replace(/^./, str => str.toUpperCase())
  }

  return (
    <Card className='border-indigo-200 dark:border-indigo-900 shadow-sm'>
      <CardHeader className='bg-indigo-50/50 dark:bg-indigo-950/20 pb-3 border-b'>
        <CardTitle className='text-sm font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400'>
          <AlertTriangle className='h-4 w-4' />
          Action Proposal: {formatKey(toolName)}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-4 pb-2'>
        <div className='text-sm space-y-2'>
          {Object.entries(args).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} className='border rounded-md p-2 bg-muted/30'>
                  <span className='font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-1'>{formatKey(key)}</span>
                  <div className='pl-2 space-y-1'>
                    {Object.entries(value).map(([subKey, subVal]) => (
                      <div key={subKey} className='grid grid-cols-[100px_1fr] gap-2'>
                        <span className='text-muted-foreground text-xs'>{formatKey(subKey)}:</span>
                        <span className='font-medium text-xs break-words'>{String(subVal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div key={key} className='grid grid-cols-[100px_1fr] gap-2 items-start'>
                <span className='text-muted-foreground text-xs'>{formatKey(key)}:</span>
                <span className='font-medium text-xs break-words'>{String(value)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className='flex justify-end gap-2 pt-2 pb-4'>
        <Button variant='outline' size='sm' onClick={onCancel} disabled={isExecuting}>
          <X className='h-3 w-3 mr-1' /> Cancel
        </Button>
        <Button variant='default' size='sm' onClick={onConfirm} disabled={isExecuting} className='bg-indigo-600 hover:bg-indigo-700'>
          <Check className='h-3 w-3 mr-1' /> Confirm
        </Button>
      </CardFooter>
    </Card>
  )
}
