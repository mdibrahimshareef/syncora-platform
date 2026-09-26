"use client"

import * as React from "react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, Check } from "lucide-react"
import { toast } from "sonner"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ActionProposalCard } from './ActionProposalCard'
import { usePathname } from 'next/navigation'

export function AIAssistant() {
  const { isAIAssistantOpen, setAIAssistantOpen } = useUIStore()
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  
  const createTask = useDataStore(s => s.createTask)
  const updateTask = useDataStore(s => s.updateTask)
  
  const [sources, setSources] = React.useState<any[]>([])
  const [input, setInput] = React.useState('')
  const pathname = usePathname()

  const { messages, error, status, addToolResult, sendMessage, data } = useChat({
    api: '/api/ai/chat',
    body: { workspaceId: activeWorkspaceId, contextUrl: pathname },
    onError: (err) => toast.error(err.message),
  })

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, error])

  React.useEffect(() => {
    if (data && data.length > 0) {
      const allSources = data
        .filter((d: any) => d && d.type === 'sources' && Array.isArray(d.sources))
        .flatMap((d: any) => d.sources)
      
      const uniqueSources = allSources.filter((source: any, idx: number, arr: any[]) => 
        arr.findIndex(s => s.id === source.id) === idx
      )
      
      setSources(uniqueSources)
    }
  }, [data])

  const onToolConfirm = async (toolCallId: string, toolName: string, args: any) => {
    try {
      if (toolName === 'create_task') {
        const projects = useDataStore.getState().projects
        const defaultProject = projects[0]
        if (!args.projectId && !defaultProject) {
          throw new Error('No active projects available in this workspace to attach the task to.')
        }

        await createTask({
          projectId: args.projectId || defaultProject.id,
          workspaceId: activeWorkspaceId as string,
          title: args.title,
          description: args.description || '',
          status: 'Todo',
          priority: args.priority || 'Medium',
          assignee: args.assigneeId,
          dueDate: args.dueDate,
          position: 0,
          isRecurring: false,
          labels: []
        })
      } else if (toolName === 'update_task') {
        if (!args.taskId) throw new Error('Task ID is required.')
        await updateTask(args.taskId, args.updates || {})
      } else if (toolName === 'assign_task') {
        if (!args.taskId || !args.assigneeId) throw new Error('Task ID and Assignee ID are required.')
        await updateTask(args.taskId, { assignee: args.assigneeId })
      } else {
        throw new Error(`Tool ${toolName} is not implemented.`)
      }

      toast.success(`Action confirmed and executed successfully.`)
      addToolResult({ toolCallId, tool: toolName, output: { success: true, message: 'Action successfully executed by user.' }})
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to execute action.')
      addToolResult({ toolCallId, tool: toolName, state: 'output-error', errorText: `Execution failed: ${err.message}` })
    }
  }

  const onToolCancel = (toolCallId: string, toolName: string) => {
    toast.info('Action cancelled.')
    addToolResult({ toolCallId, tool: toolName, output: { success: false, message: 'Action cancelled by user.' }})
  }

  return (
    <Sheet open={isAIAssistantOpen} onOpenChange={setAIAssistantOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full border-l p-0 shadow-2xl">
        <SheetHeader className="p-4 border-b bg-muted/30">
          <SheetTitle className="flex items-center gap-2 text-lg relative">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            SYNCORA AI
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {!activeWorkspaceId && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>No active workspace selected. Please select a workspace to use the AI Assistant.</p>
              </div>
            )}
            
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-1">SYNCORA AI</h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Working with {useDataStore(s => s.workspaces.find(w => w.id === activeWorkspaceId)?.name) || 'your workspace'}
                </p>
                
                <div className="w-full text-left space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">What do you need?</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => setInput("What's blocking my team?")}>What's blocking my team?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => setInput("What needs my attention today?")}>What needs my attention today?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => setInput("How is our project doing?")}>How is our project doing?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => setInput("Which projects are over budget?")}>Which projects are over budget?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => setInput("Summarize this week's work")}>Summarize this week's work</Button>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className="space-y-4">
                <div className={`flex gap-3 text-sm ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-indigo-500'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  {msg.parts?.map((part: any, partIndex: number) => {
                    if (part.type === 'text') {
                      return (
                        <div key={partIndex} className={`flex flex-col gap-2 rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {part.text}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
                
                {/* Render Tool Invocations */}
                {msg.parts?.map((part: any) => {
                  if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool') return null;
                  const toolName = part.type === 'dynamic-tool' ? part.toolName : part.type.replace('tool-', '')
                  const { toolCallId, state, input: args } = part;
                  if (state === 'output-available') {
                    // Tool was executed
                    return (
                      <div key={toolCallId} className="pl-11 text-xs text-muted-foreground flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        Action {toolName} completed.
                      </div>
                    )
                  } else if (state === 'input-available') {
                    // Tool needs confirmation
                    return (
                      <div key={toolCallId} className="pl-11 pr-4">
                        <ActionProposalCard 
                          toolName={toolName} 
                          args={args} 
                          onConfirm={() => onToolConfirm(toolCallId, toolName, args)}
                          onCancel={() => onToolCancel(toolCallId, toolName)}
                        />
                      </div>
                    )
                  }
                  return null;
                })}

                {/* Render Sources for the last assistant message */}
                {msg.role === 'assistant' && i === messages.length - 1 && sources && sources.length > 0 && (
                  <div className="pl-11 pr-4 flex flex-wrap gap-2 mt-2">
                    {sources
                      // Deduplicate sources by id
                      .filter((source: any, idx: number, arr: any[]) => arr.findIndex(s => s.id === source.id) === idx)
                      .slice(0, 3) // Limit to 3 sources for UI bounding
                      .map((source: any, i: number) => {
                        let href = source.url
                        
                        return (
                          <div key={`${source.id}-${i}`} className="flex flex-col gap-1 border rounded-md p-2 bg-background hover:bg-muted transition-colors text-xs w-full max-w-[200px]">
                             <span className="font-semibold text-foreground truncate">{source.title}</span>
                             <span className="text-muted-foreground capitalize">{source.type}</span>
                             {href ? (
                               <a href={href} target="_blank" rel="noreferrer" className="text-indigo-500 mt-1 flex items-center gap-1 group">
                                 Open {source.type} <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                               </a>
                             ) : (
                               <span className="text-muted-foreground mt-1 text-[10px]">No link available</span>
                             )}
                          </div>
                        )
                      })
                    }
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background border-border shadow-sm text-indigo-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-destructive/20 text-destructive shadow-sm">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20">
                  {error.message}
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              placeholder={activeWorkspaceId ? "Ask anything about your workspace..." : "Select workspace..."}
              value={input}
              onChange={handleInputChange}
              className="flex-1"
              disabled={isLoading || !activeWorkspaceId}
            />
            <Button type="submit" size="icon" disabled={!(input || '').trim() || isLoading || !activeWorkspaceId}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
