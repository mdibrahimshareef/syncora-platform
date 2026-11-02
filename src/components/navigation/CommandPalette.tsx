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
  Users,
  Globe,
  Keyboard
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

export function CommandPalette() {
  const router = useRouter()
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    setSelectedTaskId,
    isCreateTaskOpen,
    setCreateTaskOpen,
    setShortcutHelpOpen,
  } = useUIStore()

  const tasks = useDataStore(s => s.tasks)
  const searchResults = useDataStore(s => s.searchResults)
  const isSearching = useDataStore(s => s.isSearching)
  const globalSearch = useDataStore(s => s.globalSearch)
  const clearSearch = useDataStore(s => s.clearSearch)
  const { setTheme } = useTheme()
  const baseUrl = useWorkspaceUrl()

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
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, globalSearch])

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
                      value={`${result.title} ${result.description || ''} ${result.type}`}
                      onSelect={() => runCommand(() => {
                        if (result.type === 'project') {
                          router.push(`${baseUrl}${result.link}`)
                        } else if (result.type === 'task') {
                          router.push(`${baseUrl}${result.link}`)
                          setTimeout(() => setSelectedTaskId(result.id), 100)
                        } else {
                          router.push(`${baseUrl}${result.link}`)
                        }
                      })}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{result.title}</span>
                        {result.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">{result.description}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          ) : (
            <>
              <CommandGroup heading="Actions">
                <CommandItem onSelect={() => runCommand(() => setCreateTaskOpen(true))}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Create task</span>
                  <CommandShortcut>C</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setIsProjectOpen(true))}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  <span>Create project</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => setShortcutHelpOpen(true))}>
                  <Keyboard className="mr-2 h-4 w-4" />
                  <span>Show keyboard shortcuts</span>
                  <CommandShortcut>?</CommandShortcut>
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
                    <span className="truncate">{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => runCommand(() => router.push(baseUrl))}>
                  <LayoutDashboard className="mr-2 size-4" />
                  <span>Home</span>
                  <CommandShortcut>G H</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/projects`))}>
                  <Folders className="mr-2 size-4" />
                  <span>Projects</span>
                  <CommandShortcut>G P</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/my-tasks`))}>
                  <CheckSquare className="mr-2 size-4" />
                  <span>My Tasks</span>
                  <CommandShortcut>G M</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/inbox`))}>
                  <CheckSquare className="mr-2 size-4" />
                  <span>Inbox</span>
                  <CommandShortcut>G I</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/calendar`))}>
                  <CheckSquare className="mr-2 size-4" />
                  <span>Calendar</span>
                  <CommandShortcut>G C</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => router.push(`${baseUrl}/workload`))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Workload</span>
                </CommandItem>
              </CommandGroup>
              
              <CommandSeparator />

              <CommandGroup heading="Workspace">
                <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Switch workspace</span>
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

      <CreateTaskDialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen} />
      <CreateProjectDialog open={isProjectOpen} onOpenChange={setIsProjectOpen} />
    </>
  )
}
