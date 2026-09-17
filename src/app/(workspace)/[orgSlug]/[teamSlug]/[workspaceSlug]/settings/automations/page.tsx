"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, Plus, ArrowRight, Play, MoreVertical, Trash, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useDataStore } from "@/stores/data-store"
import { Automation } from "@/lib/api/automations"

export default function AutomationsPage() {
  const automations = useDataStore(state => state.automations)
  const fetchAutomations = useDataStore(state => state.fetchAutomations)
  const createAutomation = useDataStore(state => state.createAutomation)
  const deleteAutomation = useDataStore(state => state.deleteAutomation)
  const toggleAutomation = useDataStore(state => state.toggleAutomation)

  React.useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  const [isOpen, setIsOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newTrigger, setNewTrigger] = React.useState("TASK_CREATED")
  const [newAction, setNewAction] = React.useState("ASSIGN_TO_CREATOR")

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAutomation({
        name: newName,
        trigger_type: newTrigger,
        trigger_config: {},
        action_type: newAction,
        action_config: {}
      })
      setIsOpen(false)
      setNewName("")
    } catch (err) {
      // Error handled by store
    }
  }

  const getTriggerText = (type: string) => {
    switch(type) {
      case 'TASK_CREATED': return "When a new task is created"
      case 'TASK_STATUS_CHANGED': return "When a task status changes"
      default: return type
    }
  }

  const getActionText = (type: string) => {
    switch(type) {
      case 'ASSIGN_TO_CREATOR': return "Assign to task creator"
      case 'SET_PRIORITY': return "Set priority to High"
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Automations</h3>
          <p className="text-sm text-muted-foreground">
            Create "If this, then that" rules to eliminate manual work across your workspace.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button><Plus className="h-4 w-4 mr-2" /> New Rule</Button>
          } />
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
                <DialogDescription>Automate repetitive tasks to save time.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Rule Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Auto-assign new tasks" />
                </div>
                <div className="grid gap-2">
                  <Label>Trigger (When this happens...)</Label>
                  <Select value={newTrigger} onValueChange={(val) => val && setNewTrigger(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TASK_CREATED">When a new task is created</SelectItem>
                      <SelectItem value="TASK_STATUS_CHANGED" disabled>When task status changes (Coming soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Action (Then do this...)</Label>
                  <Select value={newAction} onValueChange={(val) => val && setNewAction(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSIGN_TO_CREATOR">Assign to task creator</SelectItem>
                      <SelectItem value="SET_PRIORITY" disabled>Set priority (Coming soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Rule</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {automations.map(automation => (
          <Card key={automation.id} className={`transition-opacity ${!automation.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className={`h-5 w-5 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                {automation.name}
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{automation.is_active ? 'Active' : 'Paused'}</Label>
                  <Switch checked={automation.is_active} onCheckedChange={(val) => toggleAutomation(automation.id, val)} />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteAutomation(automation.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                <div className="flex-1 p-3 bg-muted rounded-md border text-sm">
                  <span className="font-semibold block mb-1">WHEN</span>
                  {getTriggerText(automation.trigger_type)}
                </div>
                <div className="hidden sm:flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 p-3 bg-primary/5 rounded-md border border-primary/20 text-sm">
                  <span className="font-semibold block mb-1 text-primary">THEN</span>
                  {getActionText(automation.action_type)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {automations.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card mt-4">
            <Zap className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
            <h3 className="font-semibold text-lg">No Automations Active</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">Set up rules to handle busywork so your team can focus on what matters.</p>
            <Button variant="outline" onClick={() => setIsOpen(true)}>Create First Rule</Button>
          </div>
        )}
      </div>
    </div>
  )
}
