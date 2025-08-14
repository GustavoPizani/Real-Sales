"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task, CreateTaskData } from '@/lib/types';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  createTask: (taskData: CreateTaskData) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  getTodayTasks: () => Task[];
  getOverdueTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Mock data para tarefas
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Visita - Apartamento Vila Madalena',
    description: 'Mostrar apartamento para cliente interessado',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '14:00',
    status: 'pending',
    priority: 'high',
    type: 'visit',
    client_id: '1',
    client_name: 'Carlos Oliveira',
    property_title: 'Apartamento 3 quartos Vila Madalena',
    user_id: '1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Ligação de follow-up',
    description: 'Entrar em contato para saber sobre decisão',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '16:30',
    status: 'pending',
    priority: 'medium',
    type: 'follow_up',
    client_id: '2',
    client_name: 'Fernanda Lima',
    user_id: '1',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z'
  },
  {
    id: '3',
    title: 'Apresentação de proposta',
    description: 'Apresentar proposta final para cliente',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '18:00',
    status: 'pending',
    priority: 'high',
    type: 'meeting',
    client_id: '3',
    client_name: 'Roberto Silva',
    user_id: '1',
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z'
  },
  {
    id: '4',
    title: 'Ligação para cliente atrasado',
    description: 'Cliente não compareceu na visita agendada',
    due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_time: '10:00',
    status: 'pending',
    priority: 'high',
    type: 'call',
    client_id: '4',
    client_name: 'Ana Santos',
    user_id: '1',
    created_at: '2024-01-14T08:00:00Z',
    updated_at: '2024-01-14T08:00:00Z'
  },
  {
    id: '5',
    title: 'Reunião com equipe',
    description: 'Reunião semanal de vendas',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_time: '09:00',
    status: 'pending',
    priority: 'medium',
    type: 'meeting',
    user_id: '1',
    created_at: '2024-01-15T07:00:00Z',
    updated_at: '2024-01-15T07:00:00Z'
  }
];

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento inicial
    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
    }, 1000);
  }, []);

  const createTask = async (taskData: CreateTaskData): Promise<Task> => {
    const newTask: Task = {
      id: Date.now().toString(),
      ...taskData,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updates, updated_at: new Date().toISOString() }
          : task
      )
    );
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const completeTask = async (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: 'completed' as const, 
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : task
      )
    );
  };

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => 
      task.due_date === today && task.status === 'pending'
    ).sort((a, b) => a.due_time.localeCompare(b.due_time));
  };

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => 
      task.due_date < today && task.status === 'pending'
    ).sort((a, b) => b.due_date.localeCompare(a.due_date));
  };

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => 
      task.due_date > today && task.status === 'pending'
    ).sort((a, b) => a.due_date.localeCompare(b.due_date));
  };

  const refreshTasks = async () => {
    setLoading(true);
    // Simular refresh
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      getTodayTasks,
      getOverdueTasks,
      getUpcomingTasks,
      refreshTasks
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}
