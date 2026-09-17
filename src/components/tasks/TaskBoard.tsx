"use client"

import * as React from "react"
import { Task, TaskStatus, WorkflowStatus } from "@/types"
import { TaskColumn } from "@/components/tasks/TaskColumn"
import { TaskCard } from "@/components/tasks/TaskCard"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useDataStore } from "@/stores/data-store"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable"

interface TaskBoardProps {
  tasks: Task[]
  projectStatuses?: WorkflowStatus[]
}

const DEFAULT_COLUMNS: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done']

export function TaskBoard({ tasks: initialTasks, projectStatuses }: TaskBoardProps) {
  const moveTask = useDataStore(s => s.moveTask);
  const reorderTasks = useDataStore(s => s.reorderTasks);
  
  // Use dynamic statuses if provided, otherwise fallback to defaults
  const columns = React.useMemo(() => {
    if (projectStatuses && projectStatuses.length > 0) {
      return projectStatuses.map(s => s.name as TaskStatus)
    }
    return DEFAULT_COLUMNS
  }, [projectStatuses])
  
  // Local state for optimistic updates during drag
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks.filter(t => !t.parentId))

  // Sync internal state with props if they change outside
  const [prevInitialTasks, setPrevInitialTasks] = React.useState(initialTasks)
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks)
    setTasks(initialTasks.filter(t => !t.parentId))
  }

  // Ensure initial render also filters subtasks if we are using initialTasks
  React.useEffect(() => {
    setTasks(initialTasks.filter(t => !t.parentId))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts to allow clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeTask = React.useMemo(
    () => tasks.find((t) => t.id === activeId),
    [activeId, tasks]
  )

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === "Task"
    const isOverTask = over.data.current?.type === "Task"
    const isOverColumn = over.data.current?.type === "Column"

    if (!isActiveTask) return

    // Scenario 1: Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId)
        const overIndex = tasks.findIndex((t) => t.id === overId)

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          // Moving between columns
          const newTasks = [...tasks]
          newTasks[activeIndex].status = tasks[overIndex].status
          return arrayMove(newTasks, activeIndex, overIndex)
        }

        return arrayMove(tasks, activeIndex, overIndex)
      })
    }

    // Scenario 2: Dropping a Task over an empty Column area
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId)
        const newTasks = [...tasks]
        newTasks[activeIndex].status = overId as TaskStatus
        return arrayMove(newTasks, activeIndex, activeIndex)
      })
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) {
      // Revert if dropped outside
      setTasks(initialTasks)
      return
    }

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // First commit the local reordering globally
    reorderTasks(tasks)
    
    // Check if the status actually changed compared to the global store
    const globalTask = initialTasks.find(t => t.id === active.id)
    if (globalTask && globalTask.status !== activeTask.status) {
      moveTask(activeTask.id, activeTask.status)
    }
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
        <div className="flex w-max space-x-4 p-1">
          {columns.map(columnStatus => (
            <TaskColumn 
              key={columnStatus} 
              title={columnStatus} 
              tasks={tasks.filter(t => t.status === columnStatus)} 
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
