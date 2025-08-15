"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface Task {
  id: string
  title: string
  description?: string
  due_date: string
  due_time: string
  status: "pending" | "completed" | "cancelled"
  priority: "low" | "medium" | "high"
  type: "call" | "visit" | "follow_up" | "meeting" | "other"
  client_id?: string
  client_name?: string
  user_id: string
  created_at: string
  updated_at: string
}

interface TaskContextType {
  tasks: Task[]
  addTask: (task: Omit<Task, "id" | "created_at" | "updated_at">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  getTodayTasks: () => Task[]
  getUpcomingTasks: () => Task[]
  getOverdueTasks: () => Task[]
  getTasksByClient: (clientId: string) => Task[]
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

// Mock tasks para teste
const mockTasks: Task[] = [
  {
    id: "1",
    title: "Ligar para João Silva",
    description: "Agendar segunda visita",
    due_date: "2024-01-22",
    due_time: "09:00",
    status: "pending",
    priority: "high",
    type: "call",
    client_id: "1",
    client_name: "João Silva",
    user_id: "4",
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
  },
  {
    id: "2",
    title: "Visita com Maria Santos",
    description: "Mostrar casa nos Jardins",
    due_date: "2024-01-22",
    due_time: "14:00",
    status: "pending",
    priority: "medium",
    type: "visit",
    client_id: "2",
    client_name: "Maria Santos",
    user_id: "5",
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-01-20T00:00:00Z",
  },
  {
    id: "3",
    title: "Follow-up Pedro Costa",
    description: "Verificar interesse na cobertura",
    due_date: "2024-01-23",
    due_time: "10:30",
    status: "pending",
    priority: "low",
    type: "follow_up",
    client_id: "3",
    client_name: "Pedro Costa",
    user_id: "4",
    created_at: "2024-01-21T00:00:00Z",
    updated_at: "2024-01-21T00:00:00Z",
  },
]

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)

  const addTask = (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTasks((prev) => [newTask, ...prev])
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task)),
    )
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const getTodayTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => task.due_date === today && task.status === "pending")
  }

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => task.due_date > today && task.status === "pending")
  }

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.filter((task) => task.due_date < today && task.status === "pending")
  }

  const getTasksByClient = (clientId: string) => {
    return tasks.filter((task) => task.client_id === clientId)
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        getTodayTasks,
        getUpcomingTasks,
        getOverdueTasks,
        getTasksByClient,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

export function useTask() {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error("useTask must be used within a TaskProvider")
  }
  return context
}
