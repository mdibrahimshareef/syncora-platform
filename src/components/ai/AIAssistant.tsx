"use client"

import * as React from "react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, MessageSquarePlus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useChat } from '@ai-sdk/react'
import { ActionProposalCard } from './ActionProposalCard'
import { AIToolActivity } from './AIToolActivity'
import { AISourceList } from './AISourceList'
import { usePathname } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function AIAssistant() {
  const { isAIAssistantOpen, setAIAssistantOpen } = useUIStore()
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId)
  
  const [sources, setSources] = React.useState<any[]>([])
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined)
  const pathname = usePathname()

  const [inputValue, setInputValue] = React.useState('')

  // @ts-ignore
  const { messages, error, status, addToolResult, sendMessage, data, setMessages } = useChat({
    // @ts-ignore
    api: '/api/ai/chat',
    body: { workspaceId: activeWorkspaceId, contextUrl: pathname, conversationId },
    onError: (err) => toast.error(err.message),
    onResponse: (response: Response) => {
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId) {
        setConversationId(convId)
      }
      const initialSourcesJson = response.headers.get('X-Initial-Sources')
      if (initialSourcesJson) {
        try {
          const parsed = JSON.parse(initialSourcesJson)
          if (parsed.length > 0) {
            setSources(parsed)
          }
        } catch (e) {}
      }
    }
  })

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  const handlePromptClick = (text: string) => {
    setInputValue(text)
  }

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading || !activeWorkspaceId) return
    const textToSubmit = inputValue
    setInputValue('')
    try {
      await sendMessage({
        text: textToSubmit
      })
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to send: ' + (err.message || 'Unknown error'))
      setInputValue(textToSubmit)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(undefined)
    setSources([])
  }

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, error])

  // Phase 7: Clear context when workspace changes
  React.useEffect(() => {
    handleNewChat()
  }, [activeWorkspaceId])

  React.useEffect(() => {
    // Extract dynamic sources from tool results
    let dynamicSources: any[] = []
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.parts) {
        msg.parts.forEach((part: any) => {
          const result = part.result || part.output
          if (result && Array.isArray(result.sources)) {
            dynamicSources.push(...result.sources)
          }
        })
      }
    })
    
    if (dynamicSources.length > 0) {
      setSources(prev => {
        // Simple deduplication by id
        const merged = [...prev, ...dynamicSources]
        const seen = new Set()
        return merged.filter(s => {
          if (!s.id) return true
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })
      })
    }
  }, [messages])

  const onToolConfirm = async (toolCallId: string, toolName: string, args: any) => {
    try {
      const response = await fetch('/api/ai/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          toolName,
          args,
          actionId: toolCallId
        })
      })

      const result = await response.json()

      if (!response.ok || result.status === 'failed' || result.status === 'denied') {
        throw new Error(result.error || 'Failed to execute action securely on the server.')
      }

      if (result.status === 'conflict') {
        toast.error(`Conflict: ${result.data?.message || 'Stale state detected.'}`)
        addToolResult({ toolCallId, tool: toolName, output: { success: false, status: 'conflict', ...result.data }})
        return
      }

      if (result.status === 'already_executed') {
        toast.info('Action was already executed.')
        addToolResult({ toolCallId, tool: toolName, output: { success: true, status: 'already_executed', data: result.data }})
        return
      }

      toast.success(`Action confirmed and executed successfully.`)
      addToolResult({ toolCallId, tool: toolName, output: { success: true, status: 'executed', data: result.data }})
      
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to execute action.')
      addToolResult({ toolCallId, tool: toolName, state: 'output-error', errorText: err.message })
    }
  }

  const onToolCancel = (toolCallId: string, toolName: string) => {
    toast.info('Action cancelled.')
    addToolResult({ toolCallId, tool: toolName, output: { success: false, status: 'cancelled' }})
  }

  return (
    <Sheet open={isAIAssistantOpen} onOpenChange={setAIAssistantOpen}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg flex flex-col h-[100dvh] max-h-screen border-l p-0 shadow-2xl overflow-hidden">
        <SheetHeader className="p-4 border-b bg-muted/30 flex-row items-center justify-between space-y-0 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-lg relative">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            SYNCORA AI
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleNewChat} title="New Chat">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
                <h3 className="text-xl font-semibold mb-1">Your Syncora work assistant</h3>
                <p className="text-sm text-muted-foreground mb-6 text-balance">
                  Search your workspace, understand project status, analyze workload, and help execute confirmed actions.
                </p>
                
                <div className="w-full text-left space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Try asking:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => handlePromptClick("What needs my attention?")}>What needs my attention?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => handlePromptClick("Show overdue tasks")}>Show overdue tasks</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => handlePromptClick("What's blocking the team?")}>What's blocking the team?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => handlePromptClick("Which projects need attention?")}>Which projects need attention?</Button>
                    <Button variant="outline" className="justify-start text-sm h-auto py-2.5 font-normal" onClick={() => handlePromptClick("How much time did I track this week?")}>How much time did I track this week?</Button>
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
                  <div className="flex-1 space-y-2">
                    {(() => {
                      let renderParts = msg.parts || []
                      if (!msg.parts || renderParts.length === 0) {
                        renderParts = []
                        const msgAny = msg as any
                        if (msgAny.content) renderParts.push({ type: 'text', text: msgAny.content })
                        if (msgAny.toolInvocations) {
                          renderParts.push(...msgAny.toolInvocations.map((t: any) => ({ ...t, type: 'tool-invocation', toolName: t.toolName, toolCallId: t.toolCallId, args: t.args })))
                        }
                      }
                      return renderParts.map((part: any, partIndex: number) => {
                        if (part.type === 'text' && part.text.trim()) {
                        return (
                          <div key={partIndex} className={`flex flex-col gap-2 rounded-lg px-3 py-2 w-fit text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted text-foreground'}`}>
                            {msg.role === 'user' ? (
                              <div className="whitespace-pre-wrap">{part.text}</div>
                            ) : (
                              <div className="ai-markdown [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mb-2 [&>ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-blue-500 [&_a:hover]:underline [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:mt-2 [&_pre]:mb-2 [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-sm [&_code]:text-[13px] [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )
                      }
                      
                      if (part.type.startsWith('tool-') || part.type === 'dynamic-tool' || part.type === 'tool-invocation') {
                        // Compatibility logic for AI SDK 3
                        const toolName = part.toolName || (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : '')
                        const toolCallId = part.toolCallId || part.toolInvocationId
                        
                        // Extract state based on AI SDK version
                        // Usually Vercel AI sdk injects toolInvocations array directly into message object,
                        // but if we are mapping over parts, state might be handled natively.
                        let state = part.state
                        if (!state) {
                           if ('result' in part) state = 'result'
                           else if ('args' in part) state = 'call'
                        }
                        
                        // Add mapping logic based on our custom status outputs
                        const resultStatus = part.result?.status
                        if (resultStatus) {
                           state = resultStatus
                        }

                        if (!state) return null

                        if (['call', 'partial-call', 'result', 'output-available', 'executed', 'already_executed', 'conflict', 'failed', 'denied'].includes(state)) {
                          return (
                            <AIToolActivity key={partIndex} toolName={toolName} state={state} />
                          )
                        } else if (state === 'input-available' || state === 'requires-confirmation' || (state === 'call' && ['create_task', 'update_task', 'assign_task'].includes(toolName))) {
                          // Tool needs confirmation. We show the action proposal if result is undefined
                          if (!part.result) {
                            return (
                              <ActionProposalCard 
                                key={partIndex}
                                toolName={toolName} 
                                args={part.args || part.input} 
                                onConfirm={() => onToolConfirm(toolCallId, toolName, part.args || part.input)}
                                onCancel={() => onToolCancel(toolCallId, toolName)}
                              />
                            )
                          }
                        }
                      }
                      return null
                    })})()}
                    
                    {/* Render Sources for assistant message natively */}
                    {msg.role === 'assistant' && sources && sources.length > 0 && i === messages.length - 1 && (
                      <AISourceList sources={sources} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background border-border shadow-sm text-indigo-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted text-muted-foreground w-fit">
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
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20 text-balance">
                  {error.message || 'Syncora AI is temporarily unavailable. Your existing workspace data is unaffected.'}
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="p-4 border-t bg-background shrink-0">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <Input
              placeholder={activeWorkspaceId ? "Ask anything about your workspace..." : "Select workspace..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              disabled={isLoading || !activeWorkspaceId}
              aria-label="Chat input"
            />
            <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading || !activeWorkspaceId} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
