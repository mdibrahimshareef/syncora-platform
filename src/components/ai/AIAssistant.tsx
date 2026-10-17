"use client"

import * as React from "react"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, MessageSquarePlus, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { ActionProposalCard } from './ActionProposalCard'
import { WorkflowPlanCard } from './WorkflowPlanCard'
import { DecisionComparisonCard } from './DecisionComparisonCard'
import { MemoryProposalCard } from './MemoryProposalCard'
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }, [inputValue])

  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/ai/chat',
      body: { workspaceId: activeWorkspaceId, contextUrl: pathname, conversationId },
      fetch: async (input, init) => {
        const response = await fetch(input, init)
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
        return response
      }
    })
  }, [activeWorkspaceId, pathname, conversationId])

  const { messages, error, status, addToolResult, sendMessage, setMessages } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      console.error('[AI Chat Error]', err)
      toast.error(err.message || 'Failed to communicate with AI Assistant')
    }
  })

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  const handlePromptClick = (text: string) => {
    setInputValue(text)
  }

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>, manualText?: string) => {
    if (e) e.preventDefault()
    
    const textToSubmit = manualText || inputValue
    if (!textToSubmit.trim() || isLoading) return
    
    if (!activeWorkspaceId) {
      toast.error('Please open a workspace first to use the AI Assistant.')
      return
    }

    setInputValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
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
      <SheetContent 
        showCloseButton={false}
        overlayClassName="bg-black/10 backdrop-blur-none"
        className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl flex flex-col h-[100dvh] max-h-screen border-l border-border/80 p-0 shadow-2xl overflow-hidden bg-background"
      >
        <SheetHeader className="px-4 py-3 border-b border-border/60 bg-muted/30 flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <Sparkles className="size-4 text-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-sm font-semibold tracking-tight text-foreground">
                Syncora AI
              </SheetTitle>
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-muted/40 py-0 px-1.5 h-4">
                Assistant
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-7 rounded-md text-muted-foreground hover:text-foreground" 
              onClick={handleNewChat} 
              title="Start new conversation"
            >
              <MessageSquarePlus className="size-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-7 rounded-md text-muted-foreground hover:text-foreground" 
              onClick={() => setAIAssistantOpen(false)} 
              title="Close"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4 min-h-0 [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-6">
            {!activeWorkspaceId && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>No active workspace selected. Please select a workspace to use the AI Assistant.</p>
              </div>
            )}
            
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <div className="size-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mb-3 shadow-xs">
                  <Sparkles className="size-5 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1 tracking-tight text-foreground">How can I help with your work?</h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                  Deeply analyze projects, investigate overdue deadlines, resolve bottlenecks, and orchestrate verified actions.
                </p>
                
                <div className="w-full text-left space-y-2 max-w-md">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Prompts:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between text-left text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-indigo-500/30 transition-all group whitespace-normal text-foreground cursor-pointer shadow-2xs" 
                      onClick={() => handlePromptClick("What are the upcoming deadlines or overdue tasks in this project?")}
                    >
                      <span className="font-medium flex-1 pr-2">List overdue tasks and upcoming deadlines</span>
                      <span className="text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all text-xs shrink-0">→</span>
                    </button>
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between text-left text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-indigo-500/30 transition-all group whitespace-normal text-foreground cursor-pointer shadow-2xs" 
                      onClick={() => handlePromptClick("Plan a sprint triage for all overdue tasks and assign next steps.")}
                    >
                      <span className="font-medium flex-1 pr-2">Plan a sprint triage for overdue tasks</span>
                      <span className="text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all text-xs shrink-0">→</span>
                    </button>
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between text-left text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-indigo-500/30 transition-all group whitespace-normal text-foreground cursor-pointer shadow-2xs" 
                      onClick={() => handlePromptClick("Which projects are at risk and what are the bottlenecks?")}
                    >
                      <span className="font-medium flex-1 pr-2">Identify at-risk projects and team bottlenecks</span>
                      <span className="text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all text-xs shrink-0">→</span>
                    </button>
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between text-left text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-indigo-500/30 transition-all group whitespace-normal text-foreground cursor-pointer shadow-2xs" 
                      onClick={() => handlePromptClick("Analyze team workload and recommend rebalancing.")}
                    >
                      <span className="font-medium flex-1 pr-2">Analyze team workload and recommend rebalancing</span>
                      <span className="text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all text-xs shrink-0">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className="space-y-4">
                <div className={`flex gap-3 text-sm ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex size-8 shrink-0 select-none items-center justify-center rounded-xl border shadow-2xs ${msg.role === 'user' ? 'bg-primary text-primary-foreground border-primary/80' : 'bg-card border-border/70 text-indigo-500'}`}>
                    {msg.role === 'user' ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
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
                          <div key={partIndex} className={msg.role === 'user' ? 'flex justify-end' : 'w-full'}>
                            {msg.role === 'user' ? (
                              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] text-sm shadow-sm leading-relaxed whitespace-pre-wrap">
                                {part.text}
                              </div>
                            ) : (
                              <div className="bg-card border border-border/80 shadow-xs rounded-2xl rounded-tl-xs p-4 w-full text-sm">
                                <div className="ai-markdown text-sm leading-relaxed text-foreground [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:uppercase [&>h3]:tracking-wider [&>h3]:mb-1 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:mb-3 [&>ol]:mb-3 [&_li]:mb-1.5 [&_strong]:font-semibold [&_a]:text-indigo-500 [&_a]:font-medium [&_a:hover]:underline [&_pre]:bg-muted/80 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/60 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:mt-2 [&_pre]:mb-2 [&_code]:bg-muted/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12px] [&_code]:font-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-4 [&_hr]:border-border/60">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {part.text}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                      
                      if (part.type.startsWith('tool-') || part.type === 'dynamic-tool' || part.type === 'tool-invocation') {
                        const toolName = part.toolName || (part.type.startsWith('tool-') ? part.type.replace('tool-', '') : '')
                        const toolCallId = part.toolCallId || part.toolInvocationId
                        
                        let state = part.state
                        if (!state) {
                           if ('result' in part) state = 'result'
                           else if ('args' in part) state = 'call'
                        }
                        
                        const resultStatus = part.result?.status
                        if (resultStatus) {
                           state = resultStatus
                        }

                        if (!state) return null

                        if (toolName === 'generate_workflow_plan') {
                          return (
                            <WorkflowPlanCard 
                              key={partIndex}
                              plan={part.args || part.input}
                              result={part.result}
                              onConfirm={() => onToolConfirm(toolCallId, toolName, part.args || part.input)}
                              onCancel={() => onToolCancel(toolCallId, toolName)}
                              workspaceId={activeWorkspaceId || undefined}
                            />
                          )
                        }

                        if (toolName === 'get_decision_comparison') {
                          const comparison = part.result?.decisionComparison || part.args || part.input;
                          if (comparison) {
                            return (
                              <DecisionComparisonCard 
                                key={partIndex}
                                decisionId={comparison.decisionId}
                                situationSummary={comparison.situationSummary}
                                mainConstraints={comparison.mainConstraints || []}
                                options={comparison.options || []}
                                recommendedOptionId={comparison.recommendedOptionId}
                                recommendationRationale={comparison.recommendationRationale}
                                uncertaintyNotes={comparison.uncertaintyNotes}
                                workspaceId={activeWorkspaceId || undefined}
                              />
                            );
                          }
                        }

                        if (toolName === 'propose_memory_update') {
                          const mem = part.result?.proposed_memory || part.args || part.input;
                          if (mem) {
                            return (
                              <MemoryProposalCard 
                                key={partIndex}
                                workspaceId={activeWorkspaceId || ''}
                                scope={mem.scope || 'workspace'}
                                category={mem.category || 'decision_rationale'}
                                content={mem.content || ''}
                                reason={mem.reason}
                              />
                            );
                          }
                        }

                        if (['call', 'partial-call', 'result', 'output-available', 'executed', 'already_executed', 'conflict', 'failed', 'denied', 'completed'].includes(state.toLowerCase())) {
                          return (
                            <div key={partIndex} className="inline-block mr-1.5 mb-1">
                              <AIToolActivity toolName={toolName} state={state} />
                            </div>
                          )
                        } else if (state === 'input-available' || state === 'requires-confirmation' || (state === 'call' && ['create_task', 'update_task', 'assign_task'].includes(toolName))) {
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
            
            {isLoading && (
              <div className="flex gap-3 text-sm">
                <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl border bg-card border-border/80 shadow-2xs text-indigo-500">
                  <Bot className="size-4" />
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-xs px-4 py-3 bg-card border border-border/80 shadow-xs text-muted-foreground w-fit">
                  <Loader2 className="size-4 animate-spin text-indigo-500" />
                  <span className="text-xs font-medium">
                    {messages[messages.length - 1]?.role === 'assistant' ? 'Synthesizing verified answer...' : 'Analyzing workspace signals...'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3 text-sm">
                <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl border bg-destructive/20 text-destructive shadow-2xs">
                  <AlertCircle className="size-4" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl rounded-tl-xs p-3.5 bg-destructive/10 text-destructive border border-destructive/20 text-balance flex-1">
                  <span className="text-xs">{error.message || 'Syncora AI is temporarily unavailable. Your existing workspace data is unaffected.'}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/20 shrink-0"
                    onClick={() => {
                      const lastUser = [...messages].reverse().find(m => m.role === 'user')
                      const lastText = (lastUser as any)?.parts?.find((p: any) => p.type === 'text')?.text || (lastUser as any)?.content
                      if (lastText) {
                        handleFormSubmit(undefined, lastText)
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="p-4 border-t border-border/60 bg-background shrink-0">
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
            <div className="relative flex flex-col rounded-2xl border border-border/80 bg-background shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all p-3 pb-2.5">
              <textarea
                ref={textareaRef}
                placeholder={activeWorkspaceId ? "Ask anything about your workspace (e.g. overdue tasks, plan triage)..." : "Select workspace..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit();
                  }
                }}
                rows={1}
                className="w-full resize-none bg-transparent pr-10 text-sm outline-none placeholder:text-muted-foreground/60 min-h-[38px] max-h-36 text-foreground overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                disabled={isLoading || !activeWorkspaceId}
                aria-label="Chat input"
              />
              <div className="absolute right-2.5 bottom-2.5">
                <Button 
                  type="submit" 
                  size="icon" 
                  className="size-7 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-xs transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer"
                  disabled={!inputValue.trim() || isLoading || !activeWorkspaceId} 
                  aria-label="Send message"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 px-1 pt-1 select-none">
              <div className="flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-border/70 bg-muted/60 text-muted-foreground shadow-2xs">Shift</kbd>
                <span>+</span>
                <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-border/70 bg-muted/60 text-muted-foreground shadow-2xs">Enter</kbd>
                <span className="ml-1 text-muted-foreground/60 text-[10px]">for new line</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50">Grounded on live workspace data</span>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
