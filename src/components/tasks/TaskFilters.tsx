"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDataStore } from "@/stores/data-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Filter, Search, X, Bookmark, Save } from "lucide-react"
import { mockUsers } from "@/data/mock"
import { toast } from "sonner"

export interface TaskFilterState {
  search: string
  priorities: string[]
  statuses: string[]
  assignees: string[]
}

interface TaskFiltersProps {
  filters: TaskFilterState
  setFilters: (filters: TaskFilterState | ((prev: TaskFilterState) => TaskFilterState)) => void
}

export function TaskFilters({ filters, setFilters }: TaskFiltersProps) {
  const workspaceMembers = useDataStore(s => s.workspaceMembers);
  const savedFilters = useDataStore(s => s.savedFilters);
  const saveFilter = useDataStore(s => s.saveFilter);
  const deleteFilter = useDataStore(s => s.deleteFilter);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false)
  const [newFilterName, setNewFilterName] = React.useState("")
  
  const handlePriorityToggle = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }))
  }

  const handleAssigneeToggle = (assigneeId: string) => {
    setFilters(prev => ({
      ...prev,
      assignees: prev.assignees.includes(assigneeId)
        ? prev.assignees.filter(a => a !== assigneeId)
        : [...prev.assignees, assigneeId]
    }))
  }

  const clearFilters = () => {
    setFilters({ search: "", priorities: [], statuses: [], assignees: [] })
  }

  const handleSaveFilter = async () => {
    if (!newFilterName.trim()) return
    await saveFilter(newFilterName, filters)
    setIsSaveDialogOpen(false)
    setNewFilterName("")
  }

  const applySavedFilter = (filterData: any) => {
    setFilters({
      search: filterData.search || "",
      priorities: filterData.priorities || [],
      statuses: filterData.statuses || [],
      assignees: filterData.assignees || [],
    })
  }

  const activeFilterCount = filters.priorities.length + filters.assignees.length + filters.statuses.length

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          className="pl-8 h-9 w-[200px] lg:w-[250px]"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-9 border-dashed" />}>
          <Filter className="mr-2 size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-1 rounded-sm text-xs font-normal">
              {activeFilterCount}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            {['Urgent', 'High', 'Medium', 'Low'].map(p => (
              <DropdownMenuCheckboxItem
                key={p}
                checked={filters.priorities.includes(p)}
                onCheckedChange={() => handlePriorityToggle(p)}
              >
                {p}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Assignee</DropdownMenuLabel>
            {workspaceMembers.map(u => (
              <DropdownMenuCheckboxItem
                key={u.id}
                checked={filters.assignees.includes(u.id)}
                onCheckedChange={() => handleAssigneeToggle(u.id)}
              >
                {u.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-9 border-dashed" />}>
          <Bookmark className="mr-2 size-3.5" />
          Saved Filters
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            {savedFilters.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground italic">No saved filters</div>
            ) : (
              savedFilters.map(sf => (
                <DropdownMenuCheckboxItem
                  key={sf.id}
                  checked={false}
                  onCheckedChange={() => applySavedFilter(sf.filterData)}
                  className="flex justify-between"
                >
                  <span>{sf.name}</span>
                  <X 
                    className="size-3 text-muted-foreground hover:text-destructive cursor-pointer ml-2" 
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFilter(sf.id)
                    }} 
                  />
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger render={
              <Button variant="ghost" className="w-full justify-start text-xs h-8 px-2" disabled={activeFilterCount === 0 && !filters.search}>
                <Save className="mr-2 size-3" />
                Save Current View
              </Button>
            } />
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Save Filter View</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="E.g., High Priority Bugs" 
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveFilter} disabled={!newFilterName.trim()}>
                    Save Filter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 size-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
