"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus, FileEdit, Trash2, Clock, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function DocsClientWrapper({ orgSlug, teamSlug, workspaceSlug }: { orgSlug: string, teamSlug: string, workspaceSlug: string }) {
  const router = useRouter()
  const documents = useDataStore(s => s.documents);
  const fetchDocuments = useDataStore(s => s.fetchDocuments);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const createDocument = useDataStore(s => s.createDocument);
  const deleteDocument = useDataStore(s => s.deleteDocument);
  const currentUser = useDataStore(s => s.currentUser);
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchDocuments()
    }
  }, [activeWorkspaceId, fetchDocuments])

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateDoc = async () => {
    if (!currentUser) return
    setIsCreating(true)
    try {
      const docId = await createDocument({
        title: "Untitled Document",
        content: "",
        emoji_icon: "📄",
        author_id: currentUser.id
      })
      router.push(`/${orgSlug}/${teamSlug}/${workspaceSlug}/docs/${docId}`)
    } catch (err) {
      console.error(err)
      setIsCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(id)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
            <p className="text-muted-foreground">
              Create and manage documentation for your workspace.
            </p>
          </div>
          <Button onClick={handleCreateDoc} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Creating..." : "New Document"}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10 border-dashed">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No documents yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              Get started by creating your first document to store knowledge, notes, or guidelines.
            </p>
            <Button onClick={handleCreateDoc} disabled={isCreating} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map(doc => (
              <Card 
                key={doc.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors group relative"
                onClick={() => router.push(`/${orgSlug}/${teamSlug}/${workspaceSlug}/docs/${doc.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{doc.emoji_icon || '📄'}</span>
                      <span className="truncate">{doc.title}</span>
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1.5">
                    <Clock className="h-3 w-3" />
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {doc.content ? doc.content.replace(/<[^>]*>?/gm, '') : 'No content yet...'}
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {doc.author?.avatar_url ? (
                        <img src={doc.author.avatar_url} alt={doc.author.full_name || 'User'} className="h-full w-full object-cover" />
                      ) : (
                        <span>{(doc.author?.full_name || 'U').substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span>{doc.author?.full_name || 'Unknown User'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {documents.length > 0 && filteredDocs.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No documents found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  )
}
