"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Target } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useParams } from "next/navigation"

export default function GoalsPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const { organizations, goals, fetchGoals, createGoal, updateGoal, setActiveOrganizationId } = useOrganizationStore()
  
  const org = organizations.find(o => o.slug === orgSlug)

  React.useEffect(() => {
    if (org) {
      setActiveOrganizationId(org.id)
      fetchGoals()
    }
  }, [org, setActiveOrganizationId, fetchGoals])

  const [isOpen, setIsOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState("On Track")
  const [progress, setProgress] = React.useState("0")

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    try {
      await createGoal({
        org_id: org.id,
        name,
        description,
        status,
        progress: parseInt(progress) || 0
      })
      toast.success("Goal created successfully")
      setIsOpen(false)
      setName("")
      setDescription("")
      setStatus("On Track")
      setProgress("0")
    } catch (err: any) {
      toast.error(err.message || "Failed to create goal")
    }
  }

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    try {
      await updateGoal(id, { progress: newProgress })
      toast.success("Progress updated")
    } catch (err: any) {
      toast.error("Failed to update progress")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Organization Goals</h2>
            <p className="text-muted-foreground">
              Track high-level strategic objectives and OKRs for your organization.
            </p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button><Plus className="size-4 mr-2" /> New Goal</Button>} />
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Goal</DialogTitle>
                  <DialogDescription>Define a new objective for your organization.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Expand to European Market" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On Track">On Track</SelectItem>
                        <SelectItem value="At Risk">At Risk</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Initial Progress (%)</Label>
                    <Input type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Target className="size-4 text-muted-foreground" />
                    {goal.name}
                  </CardTitle>
                  <Badge variant={goal.status === 'Completed' ? 'default' : goal.status === 'At Risk' ? 'destructive' : 'secondary'}>
                    {goal.status}
                  </Badge>
                </div>
                {goal.description && <CardDescription className="line-clamp-2 mt-2">{goal.description}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{goal.progress || 0}%</span>
                    </div>
                    <Progress value={goal.progress || 0} className="h-2" />
                    <div className="flex justify-end pt-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleUpdateProgress(goal.id, Math.min(100, (goal.progress || 0) + 10))}>
                        +10%
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {(goal as any).owner?.avatar_url && <AvatarImage src={(goal as any).owner.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {(goal as any).owner?.full_name?.substring(0, 2).toUpperCase() || 'UN'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{(goal as any).owner?.full_name || 'Unassigned'}</span>
                    </div>
                    {goal.target_date && (
                      <span className="text-xs text-muted-foreground">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {goals.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card">
              <Target className="size-10 text-muted-foreground mb-4 opacity-20" />
              <h3 className="font-semibold text-lg">No Goals Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">Create objectives to align your teams and track organizational success.</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>Create First Goal</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
