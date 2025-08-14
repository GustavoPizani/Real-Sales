"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building, TrendingUp, DollarSign, Calendar, Phone, Mail, MapPin, Plus, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { useTask } from '@/contexts/task-context';
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { getTodayTasks, getOverdueTasks, completeTask } = useTask();
  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();

  const stats = [
    {
      title: 'Total de Clientes',
      value: '1,234',
      change: '+12%',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Imóveis Ativos',
      value: '856',
      change: '+8%',
      icon: Building,
      color: 'text-green-600'
    },
    {
      title: 'Vendas do Mês',
      value: 'R$ 2.4M',
      change: '+23%',
      icon: DollarSign,
      color: 'text-secondary-custom'
    },
    {
      title: 'Taxa de Conversão',
      value: '18.2%',
      change: '+5%',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  const recentLeads = [
    {
      id: 1,
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '(11) 99999-9999',
      interest: 'Apartamento 3 quartos',
      status: 'Novo',
      date: '2024-01-15'
    },
    {
      id: 2,
      name: 'João Santos',
      email: 'joao@email.com',
      phone: '(11) 88888-8888',
      interest: 'Casa com piscina',
      status: 'Contato',
      date: '2024-01-14'
    },
    {
      id: 3,
      name: 'Ana Costa',
      email: 'ana@email.com',
      phone: '(11) 77777-7777',
      interest: 'Cobertura duplex',
      status: 'Proposta',
      date: '2024-01-13'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'bg-blue-100 text-blue-800';
      case 'Contato':
        return 'bg-yellow-100 text-yellow-800';
      case 'Proposta':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <MapPin className="h-4 w-4 text-secondary-custom" />;
      case 'call':
        return <Phone className="h-4 w-4 text-secondary-custom" />;
      case 'follow_up':
        return <Mail className="h-4 w-4 text-secondary-custom" />;
      case 'meeting':
        return <Users className="h-4 w-4 text-secondary-custom" />;
      default:
        return <CheckSquare className="h-4 w-4 text-secondary-custom" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await completeTask(taskId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu negócio imobiliário
          </p>
        </div>
        <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-tertiary-custom text-white border-tertiary-custom">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 text-secondary-custom`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-gray-300">
                  <span className="text-secondary-custom">{stat.change}</span> em relação ao mês anterior
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-primary-custom">Leads Recentes</CardTitle>
            <CardDescription>
              Novos interessados nos últimos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-primary-custom">{lead.name}</h4>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Interesse: {lead.interest}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="border-secondary-custom text-secondary-custom hover:bg-secondary-custom hover:text-white">
                    Ver detalhes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-primary-custom flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Agenda de Hoje
                </CardTitle>
                <CardDescription>
                  Suas tarefas para hoje
                </CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="outline" size="sm" className="border-secondary-custom text-secondary-custom hover:bg-secondary-custom hover:text-white">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Tarefas atrasadas */}
              {overdueTasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Tarefas Atrasadas ({overdueTasks.length})</span>
                  </div>
                  {overdueTasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                        {getTaskIcon(task.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-red-900 truncate">{task.title}</h4>
                        <p className="text-sm text-red-700">
                          {task.client_name && `Cliente: ${task.client_name}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </Badge>
                          <span className="text-xs text-red-600">
                            Atrasada - {task.due_time}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleCompleteTask(task.id, e)}
                        className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tarefas de hoje */}
              {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma tarefa para hoje!</p>
                  <p className="text-sm">Você está em dia com suas atividades.</p>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-center w-10 h-10 bg-secondary-custom/10 rounded-full">
                      {getTaskIcon(task.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-primary-custom truncate">{task.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {task.client_name && `Cliente: ${task.client_name}`}
                        {task.property_title && ` - ${task.property_title}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getPriorityColor(task.priority)} variant="outline">
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {TASK_TYPE_LABELS[task.type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-secondary-custom">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{task.due_time}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleCompleteTask(task.id, e)}
                        className="border-green-500 text-green-600 hover:bg-green-500 hover:text-white"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
