"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CheckSquare, Clock, AlertTriangle, Calendar, User, MapPin, Phone, Mail, Users, Trash2, Edit, Filter } from 'lucide-react';
import { useTask } from '@/contexts/task-context';
import { Task, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_TYPES, TASK_PRIORITIES, CreateTaskData } from '@/lib/types';

export default function TasksPage() {
  const { 
    tasks, 
    loading, 
    createTask, 
    updateTask, 
    deleteTask, 
    completeTask, 
    getTodayTasks, 
    getOverdueTasks, 
    getUpcomingTasks 
  } = useTask();

  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [taskForm, setTaskForm] = useState<CreateTaskData>({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:00',
    priority: 'medium',
    type: 'other',
    client_id: '',
    property_id: '',
    user_id: '1'
  });

  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();
  const upcomingTasks = getUpcomingTasks();
  const completedTasks = tasks.filter(task => task.status === 'completed');

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask(taskForm);
    resetForm();
    setShowAddTask(false);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    await updateTask(editingTask.id, {
      title: taskForm.title,
      description: taskForm.description,
      due_date: taskForm.due_date,
      due_time: taskForm.due_time,
      priority: taskForm.priority,
      type: taskForm.type
    });
    
    resetForm();
    setEditingTask(null);
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '09:00',
      priority: 'medium',
      type: 'other',
      client_id: '',
      property_id: '',
      user_id: '1'
    });
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date,
      due_time: task.due_time,
      priority: task.priority,
      type: task.type,
      client_id: task.client_id || '',
      property_id: task.property_id || '',
      user_id: task.user_id
    });
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <MapPin className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'follow_up':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filterTasks = (taskList: Task[]) => {
    let filtered = taskList;

    if (filterPriority && filterPriority !== '__all__') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (filterType && filterType !== '__all__') {
      filtered = filtered.filter(task => task.type === filterType);
    }

    return filtered;
  };

  const TaskCard = ({ task, showDate = false }: { task: Task; showDate?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 bg-secondary-custom/10 rounded-full flex-shrink-0">
              {getTaskIcon(task.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-primary-custom truncate">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
              {task.client_name && (
                <div className="flex items-center gap-1 mt-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-600">{task.client_name}</span>
                </div>
              )}
              {task.property_title && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-600 truncate">{task.property_title}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEditDialog(task)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteTask(task.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(task.priority)}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge variant="outline">
              {TASK_TYPE_LABELS[task.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {showDate && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString('pt-BR')}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-secondary-custom">
              <Clock className="h-3 w-3" />
              {task.due_time}
            </div>
            {task.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => completeTask(task.id)}
                className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">Tarefas</h1>
          <p className="text-gray-600">Gerencie suas atividades e compromissos</p>
        </div>
        
        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
          <DialogTrigger asChild>
            <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Ligar para cliente interessado"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes sobre a tarefa..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Data *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_time">Horário *</Label>
                  <Input
                    id="due_time"
                    type="time"
                    value={taskForm.due_time}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, due_time: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={taskForm.type}
                    onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getTaskIcon(type)}
                            {TASK_TYPE_LABELS[type]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Prioridade *</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {TASK_PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                  Criar Tarefa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-tertiary-custom text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Hoje</p>
                <p className="text-2xl font-bold">{todayTasks.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-secondary-custom" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-200">Atrasadas</p>
                <p className="text-2xl font-bold">{overdueTasks.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Futuras</p>
                <p className="text-2xl font-bold">{upcomingTasks.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200">Concluídas</p>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as prioridades</SelectItem>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {TASK_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {getTaskIcon(type)}
                        {TASK_TYPE_LABELS[type]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filterPriority || filterType) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterPriority('');
                  setFilterType('');
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs com as tarefas */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Hoje ({todayTasks.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atrasadas ({overdueTasks.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Futuras ({upcomingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Concluídas ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {filterTasks(todayTasks).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma tarefa para hoje!</p>
              </CardContent>
            </Card>
          ) : (
            filterTasks(todayTasks).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {filterTasks(overdueTasks).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma tarefa atrasada!</p>
              </CardContent>
            </Card>
          ) : (
            filterTasks(overdueTasks).map((task) => (
              <div key={task.id} className="border-l-4 border-red-500 pl-4">
                <TaskCard task={task} showDate />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {filterTasks(upcomingTasks).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma tarefa futura!</p>
              </CardContent>
            </Card>
          ) : (
            filterTasks(upcomingTasks).map((task) => (
              <TaskCard key={task.id} task={task} showDate />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filterTasks(completedTasks).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhuma tarefa concluída ainda!</p>
              </CardContent>
            </Card>
          ) : (
            filterTasks(completedTasks).map((task) => (
              <div key={task.id} className="opacity-75">
                <TaskCard task={task} showDate />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTask} className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Título *</Label>
              <Input
                id="edit_title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_due_date">Data *</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_due_time">Horário *</Label>
                <Input
                  id="edit_due_time"
                  type="time"
                  value={taskForm.due_time}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, due_time: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_type">Tipo *</Label>
                <Select
                  value={taskForm.type}
                  onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getTaskIcon(type)}
                          {TASK_TYPE_LABELS[type]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_priority">Prioridade *</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
