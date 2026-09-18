"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, FileText, CheckCircle, Clock, Plus, Loader2, Sparkles, X } from "lucide-react"

export function RequestsClientWrapper({ orgSlug, teamSlug, workspaceSlug }: { orgSlug: string, teamSlug: string, workspaceSlug: string }) {
  const requests = useDataStore(s => s.requests);
  const requestForms = useDataStore(s => s.requestForms);
  const fetchRequests = useDataStore(s => s.fetchRequests);
  const fetchRequestForms = useDataStore(s => s.fetchRequestForms);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const currentUser = useDataStore(s => s.currentUser);
  const updateRequestStatus = useDataStore(s => s.updateRequestStatus);
  const createTask = useDataStore(s => s.createTask);
  const projects = useDataStore(s => s.projects);

  const [isConverting, setIsConverting] = useState<string | null>(null)
  const [isTriaging, setIsTriaging] = useState<string | null>(null)
  const [triageSuggestions, setTriageSuggestions] = useState<Record<string, any>>({})

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchRequests()
      fetchRequestForms()
    }
  }, [activeWorkspaceId, fetchRequests, fetchRequestForms])

  if (!currentUser) return null

  const handleSuggestTriage = async (request: any) => {
    setIsTriaging(request.id)
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, workspaceId: activeWorkspaceId })
      })
      if (!response.ok) throw new Error("Failed to get suggestion")
      const data = await response.json()
      setTriageSuggestions(prev => ({ ...prev, [request.id]: data.suggestion }))
    } catch (e) {
      console.error(e)
      alert("Failed to get AI triage suggestion.")
    } finally {
      setIsTriaging(null)
    }
  }

  const handleAcceptTriage = async (request: any, suggestion: any) => {
    setIsConverting(request.id)
    try {
      const targetProject = projects.find(p => p.id === suggestion.projectId) || projects[0]
      if (!targetProject) {
        alert("You need at least one active project.")
        setIsConverting(null)
        return
      }

      const requestDataText = Object.entries(request.data as Record<string, any>)
        .map(([k, v]) => `**${k}**: ${v}`)
        .join("\n")

      await createTask({
        projectId: targetProject.id,
        title: `[Request] ${request.form?.title || "Unknown"}`,
        description: `Requested by ${request.requester?.name || "Unknown"}\n\n${requestDataText}\n\n---\n*AI Reason:* ${suggestion.reason}`,
        status: "Todo",
        priority: suggestion.priority || "Medium",
        position: 0,
        isRecurring: false,
        labels: [],
        assignee: suggestion.assigneeId || undefined,
        dueDate: undefined,
        workspaceId: activeWorkspaceId!
      })

      await updateRequestStatus(request.id, "Triaged", undefined)
      setTriageSuggestions(prev => {
        const next = { ...prev }
        delete next[request.id]
        return next
      })

    } catch (err) {
      console.error(err)
      alert("Failed to convert request to task.")
    } finally {
      setIsConverting(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
            <p className="text-muted-foreground">
              Manage incoming work requests and triage them into tasks.
            </p>
          </div>
          <Button 
            onClick={async () => {
              if (!activeWorkspaceId || !currentUser) return
              try {
                const form = await useDataStore.getState().createRequestForm({
                  workspace_id: activeWorkspaceId,
                  title: "Website Update Request",
                  description: "Use this form to request updates to the marketing website.",
                  is_public: false,
                  fields: [
                    { name: "page", label: "Page URL", type: "text", required: true },
                    { name: "description", label: "What needs to change?", type: "textarea", required: true }
                  ]
                })

                await useDataStore.getState().submitRequest({
                  workspace_id: activeWorkspaceId,
                  form_id: form.id,
                  requester_id: currentUser.id,
                  data: {
                    page: "/pricing",
                    description: "Update the enterprise tier pricing to 'Contact Us'."
                  },
                  status: "New"
                })

                alert("Successfully created a sample Request Form and Request!")
              } catch (e) {
                console.error(e)
                alert("Failed to create sample data.")
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sample Data
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
                    <Badge variant={form.isPublic ? "default" : "secondary"}>
                      {form.isPublic ? "Public" : "Internal"}
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

          <Card className="col-span-1 row-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-muted-foreground" />
                Incoming Submissions
              </CardTitle>
              <CardDescription>Recent requests waiting for triage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map(request => (
                  <div key={request.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium">{request.form?.title || "Unknown Form"}</div>
                      <Badge variant={
                        request.status === "New" ? "default" : 
                        request.status === "Triaged" ? "secondary" : "secondary"
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {request.data && Object.entries(request.data as Record<string, any>).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {request.requester ? (
                          <>
                            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                              {request.requester.avatarUrl ? (
                                <img src={request.requester.avatarUrl} alt={request.requester.name} className="h-full w-full object-cover" />
                              ) : (
                                <span>{request.requester.name.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <span>{request.requester.name}</span>
                          </>
                        ) : (
                          <span>Unknown User</span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {triageSuggestions[request.id] && request.status === "New" && (
                      <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-md text-sm space-y-2">
                        <div className="flex items-center gap-1 font-medium text-indigo-700 dark:text-indigo-400 text-xs uppercase tracking-wider mb-2">
                          <Sparkles className="h-3 w-3" /> AI Triage Suggestion
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Priority:</span> {triageSuggestions[request.id].priority}</div>
                          <div>
                            <span className="text-muted-foreground">Project:</span>{" "}
                            {projects.find(p => p.id === triageSuggestions[request.id].projectId)?.name || "Default Project"}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground italic line-clamp-2">"{triageSuggestions[request.id].reason}"</div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs h-7"
                            disabled={isConverting === request.id}
                            onClick={() => handleAcceptTriage(request, triageSuggestions[request.id])}
                          >
                            {isConverting === request.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />} Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full text-xs h-7"
                            onClick={() => {
                               setTriageSuggestions(prev => {
                                 const next = {...prev}; delete next[request.id]; return next;
                               })
                            }}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {!triageSuggestions[request.id] && request.status === "New" && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:hover:bg-indigo-950/50"
                          disabled={isTriaging === request.id || isConverting === request.id}
                          onClick={() => handleSuggestTriage(request)}
                        >
                          {isTriaging === request.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          AI Triage
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No incoming requests.
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
