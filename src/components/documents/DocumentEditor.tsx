"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { getDocumentById, updateDocument, deleteDocument, Document } from "@/lib/api/documents"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Save, Smile, ArrowLeft, MoreVertical } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDataStore } from "@/stores/data-store"

export function DocumentEditor({ docId, onBack }: { docId: string, onBack?: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  
  // Single source of truth for the document's baseline state
  const [document, setDocument] = React.useState<Document | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [emoji, setEmoji] = React.useState("")
  
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  const linkedTasks = React.useMemo(() => {
    return workspaceTasks.filter(t => t.documentId === docId)
  }, [workspaceTasks, docId])

  React.useEffect(() => {
    let isMounted = true
    const loadDoc = async () => {
      setIsLoading(true)
      try {
        const doc = await getDocumentById(supabase, docId)
        if (isMounted) {
          setDocument(doc)
          setTitle(doc.title || "")
          setContent(doc.content || "")
          setEmoji(doc.emoji_icon || "")
        }
      } catch (error) {
        console.error("Failed to load document", error)
        toast.error("Failed to load document")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    if (docId) {
      loadDoc()
    }
    return () => { isMounted = false }
  }, [docId, supabase])

  // Auto-save logic
  const debouncedTitle = useDebounce(title, 1000)
  const debouncedContent = useDebounce(content, 1000)
  const debouncedEmoji = useDebounce(emoji, 1000)

  const handleSave = React.useCallback(async (t: string, c: string, e: string) => {
    if (!document) return
    setIsSaving(true)
    try {
      const updated = await updateDocument(supabase, document.id, {
        title: t,
        content: c,
        emoji_icon: e
      })
      setDocument(updated)
    } catch (error) {
      console.error("Failed to save", error)
      toast.error("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }, [document, supabase])

  React.useEffect(() => {
    if (!document) return
    // Prevent saving if the values haven't changed from the base document truth
    if (
      debouncedTitle !== document.title ||
      debouncedContent !== document.content ||
      debouncedEmoji !== document.emoji_icon
    ) {
      handleSave(debouncedTitle, debouncedContent, debouncedEmoji)
    }
  }, [debouncedTitle, debouncedContent, debouncedEmoji, document, handleSave])

  const handleDelete = async () => {
    if (!document) return
    
    try {
      await deleteDocument(supabase, document.id)
      toast.success("Document deleted")
      if (onBack) {
        onBack()
      } else {
        router.back()
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    }
  }

  // Ref for auto-resizing textarea
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Initialize textarea height on load
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  if (isLoading) {
    return <div className="p-12 text-muted-foreground animate-pulse">Loading document...</div>
  }

  if (!document) {
    return <div className="p-12 text-muted-foreground">Document not found.</div>
  }

  return (
    <div className="flex flex-col h-full bg-background max-w-4xl mx-auto w-full">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {isSaving ? (
            <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-yellow-500 rounded-full animate-pulse" /> Saving...</span>
          ) : (
            <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> Saved</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive cursor-pointer" 
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 md:p-12 lg:px-24">
        <div className="space-y-6">
          <div className="flex items-center gap-2 group">
            <div className="relative">
              <Input 
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="📄"
                className="text-4xl h-16 w-16 p-0 border-0 shadow-none text-center bg-transparent hover:bg-muted/50 focus-visible:ring-1"
                maxLength={10}
              />
            </div>
          </div>
          
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Document"
            className="text-4xl font-bold border-0 shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />

          <Textarea 
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing..."
            className="min-h-[500px] border-0 shadow-none px-0 focus-visible:ring-0 resize-none text-base leading-relaxed placeholder:text-muted-foreground/50 overflow-hidden"
          />

          {linkedTasks.length > 0 && (
            <div className="pt-8 mt-12 border-t border-border/50">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linked Tasks</h3>
              <div className="grid gap-2">
                {linkedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div>
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
