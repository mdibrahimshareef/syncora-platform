"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { FileText, Plus, FilePlus2 } from "lucide-react"
import { useDataStore } from "@/stores/data-store"
import { createClient } from "@/lib/supabase/client"
import { getDocuments, createDocument } from "@/lib/api/documents"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function DocumentSidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter()
  const params = useParams()
  const workspaces = useDataStore(s => s.workspaces);
  const currentUser = useDataStore(s => s.currentUser);
  const [documents, setDocuments] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const currentWorkspace = workspaces.find(w => w.name.toLowerCase().replace(/\s+/g, '-') === workspaceSlug)
  const currentDocId = params.docId as string

  const loadDocs = React.useCallback(async () => {
    if (!currentWorkspace?.id) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const data = await getDocuments(supabase, currentWorkspace.id)
      setDocuments(data || [])
    } catch (error) {
      console.error("Failed to load documents", error)
    } finally {
      setIsLoading(false)
    }
  }, [currentWorkspace?.id])

  React.useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const handleCreateDoc = async () => {
    if (!currentWorkspace?.id || !currentUser?.id) return
    try {
      const supabase = createClient()
      const newDoc = await createDocument(supabase, {
        workspace_id: currentWorkspace.id,
        title: "Untitled Document",
        content: "",
        author_id: currentUser.id
      })
      toast.success("Document created")
      await loadDocs()
      router.push(`/app/${params.orgSlug}/${params.teamSlug}/${workspaceSlug}/docs/${newDoc.id}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to create document")
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Knowledge Base
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateDoc}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="px-2 py-4 text-xs text-muted-foreground">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="px-2 py-8 text-center flex flex-col items-center justify-center text-muted-foreground">
            <FilePlus2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No documents yet.</p>
            <Button variant="link" className="h-auto p-0 text-xs mt-1" onClick={handleCreateDoc}>Create one</Button>
          </div>
        ) : (
          documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => router.push(`/app/${params.orgSlug}/${params.teamSlug}/${workspaceSlug}/docs/${doc.id}`)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent/50 text-left transition-colors",
                currentDocId === doc.id ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <span>{doc.emoji_icon || "📄"}</span>
              <span className="truncate flex-1">{doc.title || "Untitled Document"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
