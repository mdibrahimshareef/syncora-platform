import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { AutomationActionLog, AutomationRun } from '@/lib/api/automations';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ExecutionHistoryProps {
  run: AutomationRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExecutionHistory({ run, open, onOpenChange }: ExecutionHistoryProps) {
  const [logs, setLogs] = useState<AutomationActionLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (run && open) {
      const fetchLogs = async () => {
        setLoading(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('automation_action_logs')
            .select('*')
            .eq('run_id', run.id)
            .order('started_at', { ascending: true });
          
          if (!error && data) {
            setLogs(data as AutomationActionLog[]);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchLogs();
    }
  }, [run, open]);

  if (!run) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full border-l shadow-2xl z-[9999]">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl flex items-center justify-between">
            Execution Details
            <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
              {run.status.toUpperCase()}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Started {format(new Date(run.executed_at), 'MMM d, h:mm:ss a')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              
              {/* Trigger Info */}
              <div className="relative pl-6 pb-2 border-l-2 border-muted ml-2">
                <div className="absolute -left-2 top-0 bg-primary/20 text-primary w-4 h-4 rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div className="text-sm font-medium">Trigger Activated</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Root Event: <code className="bg-muted px-1 py-0.5 rounded">{run.root_event_id.substring(0, 8)}</code>
                </div>
                {run.triggered_by && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Triggered by User
                  </div>
                )}
              </div>

              {loading ? (
                <div className="pl-6 ml-2 text-sm text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-2 animate-spin" /> Fetching execution steps...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-muted ml-2 last:border-l-transparent last:pb-0">
                    <div className="absolute -left-2 top-0 bg-background w-4 h-4 rounded-full flex items-center justify-center">
                      {log.status === 'Success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 bg-background" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive bg-background" />
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      Action {index + 1}: {log.action_type}
                    </div>
                    
                    {log.error_message ? (
                      <div className="mt-2 text-xs bg-destructive/10 text-destructive p-2 rounded border border-destructive/20 flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 shrink-0 mt-0.5" />
                        <span className="break-all">{log.error_message}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()}ms
                      </div>
                    )}
                  </div>
                ))
              )}

              {run.status === 'completed' && logs.length > 0 && (
                <div className="relative pl-6 ml-2">
                  <div className="absolute -left-2 top-0 bg-background w-4 h-4 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary bg-background" />
                  </div>
                  <div className="text-sm font-medium text-primary">Automation Completed</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
