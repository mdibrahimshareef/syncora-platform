"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Send, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function RequestsPage() {
  const requests = useDataStore(s => s.requests);
  const requestForms = useDataStore(s => s.requestForms);
  const createRequestForm = useDataStore(s => s.createRequestForm);
  const submitRequest = useDataStore(s => s.submitRequest);
  const updateRequestStatus = useDataStore(s => s.updateRequestStatus);
  const createTask = useDataStore(s => s.createTask);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const projects = useDataStore(s => s.projects);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isTriageOpen, setIsTriageOpen] = React.useState(false)
  const searchParams = useSearchParams();
  const [isSubmitOpen, setIsSubmitOpen] = React.useState(searchParams.get("new") === "true")

  // New Form State
  const [fTitle, setFTitle] = React.useState("")
  const [fDesc, setFDesc] = React.useState("")
  const [fPublic, setFPublic] = React.useState(false)

  // Submit Request State
  const [sFormId, setSFormId] = React.useState("")
  const [sData, setSData] = React.useState("")

  // Triage State
  const [tRequestId, setTRequestId] = React.useState("")
  const [tProjectId, setTProjectId] = React.useState("")

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId) return
    
    try {
      await createRequestForm({
        workspace_id: activeWorkspaceId,
        title: fTitle,
        description: fDesc,
        schema: { fields: [] }, // simplified for now
        is_public: fPublic
      })
      toast.success("Intake form created successfully")
      setIsFormOpen(false)
      setFTitle("")
      setFDesc("")
      setFPublic(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to create form")
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !sFormId) return

    try {
      let parsedData = {}
      try {
        parsedData = JSON.parse(sData)
      } catch (e) {
        parsedData = { note: sData }
      }

      await submitRequest({
        workspace_id: activeWorkspaceId,
        form_id: sFormId,
        data: parsedData,
        requester_id: useDataStore.getState().currentUser?.id
      })
      toast.success("Request submitted successfully")
      setIsSubmitOpen(false)
      setSFormId("")
      setSData("")
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request")
    }
  }

  const handleTriage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !tRequestId || !tProjectId) return

    try {
      const request = requests.find(r => r.id === tRequestId)
      if (!request) throw new Error("Request not found")

      const form = requestForms.find(f => f.id === request.form_id)
      
      // Create a task from the request
      const taskPayload = {
        title: `Request: ${form?.title || 'Incoming'}`,
        description: JSON.stringify(request.data, null, 2),
        status: 'Todo' as const,
        priority: 'Medium' as const,
        projectId: tProjectId,
        workspaceId: activeWorkspaceId,
        position: 0,
      }
      
      await createTask(taskPayload)
      // Since createTask is optimistic and doesn't return the ID right away in our simple version,
      // we'll just update the status without linking the task ID for now.
      await updateRequestStatus(tRequestId, 'Triaged')

      toast.success("Request triaged into a task")
      setIsTriageOpen(false)
      setTRequestId("")
      setTProjectId("")
    } catch (err: any) {
      toast.error(err.message || "Failed to triage request")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Work Intake</h2>
            <p className="text-muted-foreground">
              Manage incoming work requests and triage them into tasks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
              <DialogTrigger render={<Button variant="outline"><Send className="size-4 mr-2" /> Submit Request</Button>} />
              <DialogContent>
                <form onSubmit={handleSubmitRequest}>
                  <DialogHeader>
                    <DialogTitle>Submit Request</DialogTitle>
                    <DialogDescription>Submit a test request to an active form.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Form</Label>
                      <Select value={sFormId} onValueChange={(v) => setSFormId(v as string)} required>
                        <SelectTrigger><SelectValue placeholder="Select a form" /></SelectTrigger>
                        <SelectContent>
                          {requestForms.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Request Data (JSON or Text)</Label>
                      <Textarea value={sData} onChange={(e) => setSData(e.target.value)} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Submit</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger render={<Button><Plus className="size-4 mr-2" /> Create Form</Button>} />
              <DialogContent>
                <form onSubmit={handleCreateForm}>
                  <DialogHeader>
                    <DialogTitle>Create Intake Form</DialogTitle>
                    <DialogDescription>Define a new work intake form.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Form Title</Label>
                      <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} required />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={fPublic} onChange={(e) => setFPublic(e.target.checked)} id="publicToggle" className="size-4" />
                      <Label htmlFor="publicToggle">Make Public (External)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Hidden Triage Dialog triggered from request buttons */}
            <Dialog open={isTriageOpen} onOpenChange={setIsTriageOpen}>
              <DialogContent>
                <form onSubmit={handleTriage}>
                  <DialogHeader>
                    <DialogTitle>Triage Request</DialogTitle>
                    <DialogDescription>Convert this request into an actionable task.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Destination Project</Label>
                      <Select value={tProjectId} onValueChange={(v) => setTProjectId(v as string)} required>
                        <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Accept & Create Task</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Forms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Active Forms
              </CardTitle>
              <CardDescription>Intake forms configured for this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requestForms.map(form => (
                  <div key={form.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <div className="font-medium">{form.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{form.description}</div>
                    </div>
                    <Badge variant={form.is_public ? "default" : "secondary"}>
                      {form.is_public ? "Public" : "Internal"}
                    </Badge>
                  </div>
                ))}
                {requestForms.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                    No forms created yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Incoming Requests */}
          <Card className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-muted-foreground" />
                Incoming Submissions
              </CardTitle>
              <CardDescription>Recent requests waiting for triage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map(request => {
                  const form = requestForms.find(f => f.id === request.form_id) || (request as any).form
                  return (
                    <div key={request.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                      <div className="flex items-start justify-between">
                        <div className="font-medium">{form?.title || "Unknown Form"}</div>
                        <Badge variant={
                          request.status === 'New' ? 'default' : 
                          request.status === 'Triaged' ? 'secondary' : 
                          request.status === 'In Progress' ? 'outline' : 'secondary'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {request.data && typeof request.data === 'object' 
                          ? Object.entries(request.data).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : JSON.stringify(request.data)
                        }
                      </div>

                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {(request as any).requester?.full_name || "Anonymous"}
                        </div>
                        {request.status === 'New' && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setTRequestId(request.id)
                              setIsTriageOpen(true)
                            }}
                          >
                            <Check className="size-3 mr-1" />
                            Triage
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {requests.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                    No active requests.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
