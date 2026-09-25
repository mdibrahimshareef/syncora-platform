"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, Plus, Play, MoreVertical, Trash, CheckCircle2, History, X } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { useDataStore } from "@/stores/data-store"
import { Automation, AutomationRun } from "@/lib/api/automations"
import { AutomationBuilder } from "@/components/automations/AutomationBuilder"
import { ExecutionHistory } from "@/components/automations/ExecutionHistory"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { Template } from "@/lib/api/templates"

export default function AutomationsPage() {
  const automations = useDataStore(state => state.automations)
  const automationRuns = useDataStore(state => state.automationRuns)
  const fetchAutomations = useDataStore(state => state.fetchAutomations)
  const fetchAutomationRuns = useDataStore(state => state.fetchAutomationRuns)
  const createAutomation = useDataStore(state => state.createAutomation)
  const deleteAutomation = useDataStore(state => state.deleteAutomation)
  const updateAutomation = useDataStore(state => state.updateAutomation)
  const templates = useDataStore(state => state.templates)
  const fetchTemplates = useDataStore(state => state.fetchTemplates)

  React.useEffect(() => {
    fetchAutomations()
    fetchAutomationRuns()
    fetchTemplates()
  }, [fetchAutomations, fetchAutomationRuns, fetchTemplates])

  const [isBuilding, setIsBuilding] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null)
  const [selectedRun, setSelectedRun] = React.useState<AutomationRun | null>(null)

  const handleCreate = async (data: any) => {
    try {
      await createAutomation(data)
      setIsBuilding(false)
      toast.success("Automation rule created")
    } catch (err) {
      toast.error("Failed to create automation")
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PUBLISHED' ? 'DISABLED' : 'PUBLISHED'
      await updateAutomation(id, { status: newStatus as any })
      toast.success(newStatus === 'PUBLISHED' ? "Automation published" : "Automation disabled")
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  if (isBuilding) {
    return (
      <AutomationBuilder 
        initialData={selectedTemplate}
        onSave={handleCreate} 
        onCancel={() => { setIsBuilding(false); setSelectedTemplate(null) }} 
      />
    )
  }

  const automationTemplates = templates.filter(t => t.category === 'Automation')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Automations</h3>
          <p className="text-sm text-muted-foreground">
            Build production-grade workflows to automate your team's busywork.
          </p>
        </div>
        <Button onClick={() => { setSelectedTemplate(null); setIsBuilding(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Create Automation
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="pt-4">
          <div className="grid gap-4">
            {automations.map(automation => (
              <Card key={automation.id} className={`transition-opacity ${automation.status === 'DISABLED' ? 'opacity-60' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${automation.status === 'PUBLISHED' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{automation.name}</CardTitle>
                      {automation.description && <CardDescription>{automation.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{automation.status}</span>
                      <Switch 
                        checked={automation.status === 'PUBLISHED'} 
                        onCheckedChange={() => toggleStatus(automation.id, automation.status)} 
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteAutomation(automation.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Trigger:</span> {automation.trigger_type.replace('_', ' ')}
                    {' • '}
                    <span className="font-medium text-foreground">Actions:</span> {automation.actions?.length || 1}
                  </div>
                </CardContent>
              </Card>
            ))}

            {automations.length === 0 && (
              <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card mt-4">
                <Zap className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="font-semibold text-lg">No Automations Created</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">Set up visual IF/THEN rules to handle repetitive tasks.</p>
                <Button variant="outline" onClick={() => { setSelectedTemplate(null); setIsBuilding(true) }}>Start Building</Button>
              </div>
            )}

            {automationTemplates.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Start from a Template</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {automationTemplates.map(template => {
                     const content = template.content as any;
                     return (
                       <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                          setSelectedTemplate({
                             name: template.name,
                             description: template.description,
                             trigger_type: content.trigger_type,
                             trigger_config: content.trigger_config,
                             conditions: content.conditions,
                             actions: content.actions
                          });
                          setIsBuilding(true);
                       }}>
                         <CardHeader className="pb-2">
                           <CardTitle className="text-sm">{template.name}</CardTitle>
                         </CardHeader>
                         <CardContent>
                           <p className="text-xs text-muted-foreground">{template.description}</p>
                         </CardContent>
                       </Card>
                     )
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>View the execution logs for your automations.</CardDescription>
            </CardHeader>
            <CardContent>
              {automationRuns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No automation runs recorded yet.</div>
              ) : (
                <div className="space-y-4">
                  {automationRuns.map(run => {
                    const auto = automations.find(a => a.id === run.automation_id)
                    return (
                      <div key={run.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedRun(run)}>
                        <div className="flex items-center gap-4">
                          {run.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : run.status === 'failed' ? (
                            <X className="h-5 w-5 text-destructive" />
                          ) : (
                            <Play className="h-5 w-5 text-amber-500" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{auto?.name || 'Deleted Automation'}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(run.executed_at), 'MMM d, yyyy h:mm a')} • Depth: {run.execution_depth}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">View Logs</Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExecutionHistory 
        run={selectedRun} 
        open={!!selectedRun} 
        onOpenChange={(open) => !open && setSelectedRun(null)} 
      />
    </div>
  )
}
