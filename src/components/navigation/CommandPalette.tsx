"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Settings, 
  LayoutDashboard,
  CheckSquare,
  Folders,
  PlusCircle,
  FolderPlus,
  Moon,
  Sun,
  Laptop,
  Search,
  Users,
  CheckCircle2,
  UserPlus,
  ArrowUpCircle
} from "lucide-react"

import {
  CommandDialog,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useUIStore } from "@/stores/ui-store"
import { useDataStore } from "@/stores/data-store"
import { useWorkspaceUrl } from "@/hooks/useWorkspaceUrl"
import { useTheme } from "next-themes"

import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"
import { Building2, MessageSquare, CheckCircle, FileText, Globe } from "lucide-react"

export function CommandPalette() {
  const router = useRouter()
  const { isCommandPaletteOpen, setCommandPaletteOpen, setSelectedTaskId, selectedTaskId } = useUIStore()
  const tasks = useDataStore(s => s.tasks);
  const workspaceTasks = useDataStore(s => s.workspaceTasks);
  const searchResults = useDataStore(s => s.searchResults);
  const isSearching = useDataStore(s => s.isSearching);
  const globalSearch = useDataStore(s => s.globalSearch);
  const clearSearch = useDataStore(s => s.clearSearch);
  const updateTask = useDataStore(s => s.updateTask);
  const currentUser = useDataStore(s => s.currentUser);
  const { setTheme } = useTheme()
  const baseUrl = useWorkspaceUrl()

  const [isTaskOpen, setIsTaskOpen] = React.useState(false)
  const [isProjectOpen, setIsProjectOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  React.useEffect(() => {
    if (!isCommandPaletteOpen) {
      setSearchQuery("")
      clearSearch()
    }
  }, [isCommandPaletteOpen, clearSearch])

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      globalSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, globalSearch])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Toggle Command Palette with Cmd+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!isCommandPaletteOpen)
      }
      
      // Global shortcut for Create Task with 'C' (when not typing in an input)
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.hasAttribute("contenteditable")
        ) {
          return
        }
        e.preventDefault()
        setIsTaskOpen(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isCommandPaletteOpen, setCommandPaletteOpen])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setCommandPaletteOpen(false)
      command()
    },
    [setCommandPaletteOpen]
  )

  return (
    <>
      <CommandDialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <CommandInput 
          placeholder="Type a command or search workspace..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {searchQuery ? (
            <>
              {isSearching ? (
                <div className="p-4 text-sm text-center text-muted-foreground">Searching...</div>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Search Results">
                  {searchResults.map(result => (
                    <CommandItem 
                      key={result.id}
                      onSelect={() => runCommand(() => {
                        if (result.type === 'project') {
                          router.push(`${baseUrl}${result.link}`)
                        } else if (result.type === 'user') {
                          router.push(`${baseUrl}${result.link}`)
                        } else if (result.type === 'document') {
                          router.push(`${baseUrl}${result.link}`)
                        } else if (result.type === 'task') {
                          if (result.projectId) {
                            router.push(`${baseUrl}/projects/${result.projectId}?task=${result.id}`)
                            setTimeout(() => setSelectedTaskId(result.id), 100)
                          } else {
                            router.push(`${baseUrl}${result.link}`)
                          }
                        }
                      })}
                    >
                      {result.type === 'project' ? <Folders className="mr-2 h-4 w-4 text-indigo-500" /> : 
                       result.type === 'user' ? <Users className="mr-2 h-4 w-4 text-blue-500" /> :
                       result.type === 'document' ? <CheckSquare className="mr-2 h-4 w-4 text-yellow-500" /> :
                       <CheckSquare className="mr-2 h-4 w-4 text-emerald-500" />}
                      <div className="flex flex-col">
                        <span>{result.title}</span>
                        {result.description && <span className="text-xs text-muted-foreground">{result.description}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          ) : (
            <>
              {selectedTaskId && (
                <CommandGroup heading="Contextual Task Actions">
                  <CommandItem onSelect={() => runCommand(() => {
                    updateTask(selectedTaskId, { assignee: currentUser || undefined })
                  })}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Assign to me</span>
                  </CommandItem>
                  <CommandItem onSelect={() => runCommand(() => {
                    updateTask(selectedTaskId, { status: 'Done' })
                  })}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    <span>Mark as Done</span>
                  </CommandItem>
                  <CommandItem onSelect={() => runCommand(() => {
                    updateTask(selectedTaskId, { priority: 'High' })
                  })}>
                    <ArrowUpCircle className="mr-2 h-4 w-4 text-orange-500" />
                    <span>Set Priority High</span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => runCommand(() => setIsTaskOpen(true))}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Create task</span>
                  <CommandShortcut>C</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setIsProjectOpen(true))}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  <span>Create project</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />
              
              <CommandGroup heading="Recent Tasks">
                {tasks.slice(0, 5).map(task => (
                  <CommandItem 
                    key={task.id} 
                    onSelect={() => runCommand(() => {
                      router.push(`${baseUrl}/projects/${task.projectId}`)
                      setTimeout(() => setSelectedTaskId(task.id), 100)
                    })}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Workspace">
                <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Switch workspace</span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => runCommand(() => router.push(baseUrl))}>
                  <LayoutDashboard className="mr-2 size-4" />
                  <span>Home</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/projects`))}>
                  <Folders className="mr-2 size-4" />
                  <span>Projects</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/my-tasks`))}>
                  <CheckSquare className="mr-2 size-4" />
                  <span>My Tasks</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/workload`))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Go to Workload</span>
                </CommandItem>
              </CommandGroup>
              
              <CommandSeparator />
          
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop className="mr-2 h-4 w-4" />
              <span>System Theme</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />
          
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/settings`))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>

      <CreateTaskDialog open={isTaskOpen} onOpenChange={setIsTaskOpen} />
      <CreateProjectDialog open={isProjectOpen} onOpenChange={setIsProjectOpen} />
    </>
  )
}
