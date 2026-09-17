"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowLeft, Save, Loader2, Edit3, Eye, CheckSquare, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

export function DocEditorClient({ docId, backUrl }: { docId: string, backUrl: string }) {
  const router = useRouter()
  const documents = useDataStore(s => s.documents);
  const fetchDocuments = useDataStore(s => s.fetchDocuments);
  const updateDocument = useDataStore(s => s.updateDocument);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const fetchWorkspaceTasks = useDataStore(s => s.fetchWorkspaceTasks);
  const [doc, setDoc] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [emoji, setEmoji] = useState("📄")
  const [isSaving, setIsSaving] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isTaskPopoverOpen, setIsTaskPopoverOpen] = useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false)

  useEffect(() => {
    if (activeWorkspaceId && documents.length === 0) {
      fetchDocuments()
    }
    if (activeWorkspaceId && workspaceTasks.length === 0) {
      fetchWorkspaceTasks()
    }
  }, [activeWorkspaceId, documents.length, fetchDocuments, workspaceTasks.length, fetchWorkspaceTasks])

  useEffect(() => {
    const found = documents.find(d => d.id === docId)
    if (found && !doc) {
      setDoc(found)
      setTitle(found.title)
      setContent(found.content || "")
      setEmoji(found.emoji_icon || "📄")
    } else if (!found && !hasAttemptedFetch) {
      setHasAttemptedFetch(true)
      
      // Fetch specifically this document directly to avoid race conditions
      const fetchSpecificDoc = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data } = await supabase
            .from('documents')
            .select('*, author:author_id(id, full_name, avatar_url)')
            .eq('id', docId)
            .single()
            
          if (data && !doc) {
            setDoc(data)
            setTitle(data.title)
            setContent(data.content || "")
            setEmoji(data.emoji_icon || "📄")
            // Optionally add it to the global store so it's there
            useDataStore.setState((state) => {
              if (!state.documents.find(d => d.id === data.id)) {
                return { documents: [data, ...state.documents] }
              }
              return state
            })
          }
        } catch (err) {
          console.error("Failed to fetch specific document", err)
        }
      }
      
      fetchSpecificDoc()
    }
  }, [documents, docId, doc, hasAttemptedFetch])

  const pendingSave = React.useRef(false)

  const handleSave = useCallback(async (isManual = false) => {
    if (!doc) return
    setIsSaving(true)
    try {
      await updateDocument(doc.id, {
        title,
        content,
        emoji_icon: emoji
      })
      
      // Update local `doc` so auto-save doesn't re-trigger
      setDoc((prev: any) => ({ ...prev, title, content, emoji_icon: emoji }))
      pendingSave.current = false
      setLastSaved(new Date())
      
      if (isManual) {
        toast.success("Document saved successfully")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to save document: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [doc, title, content, emoji, updateDocument])

  // Simple auto-save (debounced)
  useEffect(() => {
    if (!doc) return
    if (title === doc.title && content === doc.content && emoji === doc.emoji_icon) return

    pendingSave.current = true
    const timer = setTimeout(() => {
      handleSave()
    }, 2000)
    return () => clearTimeout(timer)
  }, [title, content, emoji, doc, handleSave])

  // Save on unmount if pending
  useEffect(() => {
    return () => {
      if (pendingSave.current) {
        handleSave()
      }
    }
  }, [handleSave])

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const insertTaskLink = (task: any) => {
    const linkText = `[Task: ${task.title}](/projects/${task.projectId || activeWorkspaceId}?task=${task.id}) `;
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + linkText + content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = start + linkText.length;
          textareaRef.current.selectionEnd = start + linkText.length;
        }
      }, 0);
    } else {
      setContent(prev => prev + "\\n" + linkText);
    }
    setIsTaskPopoverOpen(false);
  }

  // Very basic Markdown parser for preview
  const renderMarkdown = (text: string) => {
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      // Italic
      .replace(/\*(.*)\*/gim, '<i>$1</i>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' target='_blank' class='text-blue-500 underline'>$1</a>")
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, "<pre class='bg-muted p-4 rounded-md my-2'><code>$1</code></pre>")
      // Inline code
      .replace(/`([^`]+)`/gim, "<code class='bg-muted px-1 rounded'>$1</code>")
      // Lists (simple)
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Paragraphs (double newline)
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br />')

    return `<div class="prose dark:prose-invert max-w-none"><p>${html}</p></div>`
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/20">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground hidden sm:block">
            {lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : 'Editing...'}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <><Edit3 className="h-4 w-4 mr-2" /> Edit</> : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
          </Button>
          {!isPreview && (
            <Popover open={isTaskPopoverOpen} onOpenChange={setIsTaskPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Link Task
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search tasks..." />
                  <CommandList>
                    <CommandEmpty>No tasks found.</CommandEmpty>
                    <CommandGroup>
                      {workspaceTasks.slice(0, 20).map((t) => (
                        <CommandItem key={t.id} onSelect={() => insertTaskLink(t)}>
                          <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {/* Title area */}
        <div className="flex items-center gap-4 mb-8 group">
          <div className="relative">
            <Input 
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="text-4xl h-16 w-16 p-0 text-center bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
              maxLength={2}
            />
          </div>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-4xl font-bold h-auto py-2 bg-transparent border-transparent hover:border-input focus:border-input px-2 transition-colors flex-1"
            placeholder="Document Title"
          />
        </div>

        {/* Content area */}
        {isPreview ? (
          <div 
            className="min-h-[500px] py-4 px-2"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[500px] p-2 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-base leading-relaxed"
            placeholder="Start writing using Markdown...
# Heading 1
## Heading 2
**Bold text** and *italic text*
- List item 1
- List item 2
[Link](https://example.com)
```
Code block
```"
          />
        )}
      </div>
    </div>
  )
}
