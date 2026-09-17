"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, CheckSquare, Folders } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { performGlobalSearch, SearchResult } from "@/lib/api/search"
import { createClient } from "@/lib/supabase/client"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface GlobalSearchProps {
  workspaceId: string
}

export function GlobalSearch({ workspaceId }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const supabase = createClient()

  const debouncedQuery = useDebounce(query, 300)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }
      
      setLoading(true)
      try {
        const data = await performGlobalSearch(supabase, workspaceId, debouncedQuery)
        setResults(data)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }
    
    search()
  }, [debouncedQuery, workspaceId])

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="mr-2 h-4 w-4" />
      case 'project': return <Folders className="mr-2 h-4 w-4" />
      case 'document': return <FileText className="mr-2 h-4 w-4" />
      default: return <Search className="mr-2 h-4 w-4" />
    }
  }

  const tasks = results.filter(r => r.type === 'task')
  const projects = results.filter(r => r.type === 'project')
  const docs = results.filter(r => r.type === 'document')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border rounded-md transition-colors w-full max-w-[240px] group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:max-w-none group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent hover:group-data-[collapsible=icon]:bg-sidebar-accent hover:group-data-[collapsible=icon]:text-sidebar-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="group-data-[collapsible=icon]:hidden">Search this workspace...</span>
        <kbd className="group-data-[collapsible=icon]:hidden ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search tasks, projects, docs..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <div className="p-4 text-sm text-center text-muted-foreground">Searching...</div>}
          {!loading && query.length > 1 && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          
          {tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.map(t => (
                <CommandItem key={`${t.type}-${t.id}`} onSelect={() => {
                  setOpen(false)
                  router.push(t.link)
                }}>
                  {getIcon(t.type)}
                  <span>{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map(p => (
                <CommandItem key={`${p.type}-${p.id}`} onSelect={() => {
                  setOpen(false)
                  router.push(p.link)
                }}>
                  {getIcon(p.type)}
                  <span>{p.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {docs.length > 0 && (
            <CommandGroup heading="Documents">
              {docs.map(d => (
                <CommandItem key={`${d.type}-${d.id}`} onSelect={() => {
                  setOpen(false)
                  router.push(d.link)
                }}>
                  {getIcon(d.type)}
                  <span>{d.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
