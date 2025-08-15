"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Users, Shield, Edit, Trash2, Crown, Briefcase, User, AlertTriangle } from "lucide-react"
import { type User as UserType, type CreateUserData, USER_ROLES, USER_ROLE_LABELS } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"

// Mock data
const mockUsers: UserType[] = [
  {
    id: "1",
    name: "Admin Master",
    email: "admin@empresa.com",
    role: "marketing_adm",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Carlos Diretor",
    email: "carlos.diretor@empresa.com",
    role: "diretor",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "3",
    name: "Ana Gerente",
    email: "ana.gerente@empresa.com",
    role: "gerente",
    manager_id: "2",
    created_at: "2024-01-03T00:00:00Z",
    manager: {
      id: "2",
      name: "Carlos Diretor",
      email: "carlos.diretor@empresa.com",
      role: "diretor",
      created_at: "2024-01-02T00:00:00Z",
    },
  },
  {
    id: "4",
    name: "João Corretor",
    email: "joao.corretor@empresa.com",
    role: "corretor",
    manager_id: "3",
    created_at: "2024-01-04T00:00:00Z",
    manager: {
      id: "3",
      name: "Ana Gerente",
      email: "ana.gerente@empresa.com",
      role: "gerente",
      created_at: "2024-01-03T00:00:00Z",
    },
  },
  {
    id: "5",
    name: "Maria Corretora",
    email: "maria.corretora@empresa.com",
    role: "corretor",
    manager_id: "3",
    created_at: "2024-01-05T00:00:00Z",
    manager: {
      id: "3",
      name: "Ana Gerente",
      email: "ana.gerente@empresa.com",
      role: "gerente",
      created_at: "2024-01-03T00:00:00Z",
    },
  },
]

export default function AccessManagementPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserType[]>([])
  const [directors, setDirectors] = useState<UserType[]>([])
  const [managers, setManagers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)

  const [userForm, setUserForm] = useState<CreateUserData>({
    name: "",
    email: "",
    password: "",
    role: "corretor",
    manager_id: "",
  })

  // Verificar se o usuário tem permissão para acessar esta página
  useEffect(() => {
    if (user && user.role !== "marketing_adm") {
      router.push("/dashboard")
      return
    }
  }, [user, router])

  useEffect(() => {
    // Simular carregamento dos dados
    setTimeout(() => {
      setUsers(mockUsers)
      setDirectors(mockUsers.filter((u) => u.role === "diretor"))
      setManagers(mockUsers.filter((u) => u.role === "gerente"))
      setLoading(false)
    }, 1000)
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    const newUser: UserType = {
      id: Date.now().toString(),
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      manager_id: userForm.manager_id || undefined,
      manager: userForm.manager_id ? [...directors, ...managers].find((u) => u.id === userForm.manager_id) : undefined,
      created_at: new Date().toISOString(),
    }

    setUsers((prev) => [...prev, newUser])

    // Atualizar listas de diretores e gerentes se necessário
    if (newUser.role === "diretor") {
      setDirectors((prev) => [...prev, newUser])
    } else if (newUser.role === "gerente") {
      setManagers((prev) => [...prev, newUser])
    }

    resetForm()
    setShowCreateUser(false)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) return

    const updatedUser: UserType = {
      ...editingUser,
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      manager_id: userForm.manager_id || undefined,
      manager: userForm.manager_id ? [...directors, ...managers].find((u) => u.id === userForm.manager_id) : undefined,
    }

    setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)))

    // Atualizar listas de diretores e gerentes
    setDirectors((prev) => {
      const filtered = prev.filter((u) => u.id !== editingUser.id)
      return updatedUser.role === "diretor" ? [...filtered, updatedUser] : filtered
    })

    setManagers((prev) => {
      const filtered = prev.filter((u) => u.id !== editingUser.id)
      return updatedUser.role === "gerente" ? [...filtered, updatedUser] : filtered
    })

    resetForm()
    setEditingUser(null)
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza que deseja remover este usuário?")) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setDirectors((prev) => prev.filter((u) => u.id !== userId))
      setManagers((prev) => prev.filter((u) => u.id !== userId))
    }
  }

  const resetForm = () => {
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "corretor",
      manager_id: "",
    })
  }

  const openEditDialog = (user: UserType) => {
    setEditingUser(user)
    setUserForm({
      name: user.name,
      email: user.email,
      password: "", // Não preencher senha por segurança
      role: user.role,
      manager_id: user.manager_id || "",
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "marketing_adm":
        return <Crown className="h-4 w-4 text-purple-600" />
      case "diretor":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "gerente":
        return <Briefcase className="h-4 w-4 text-green-600" />
      case "corretor":
        return <User className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    const colors = {
      marketing_adm: "bg-purple-100 text-purple-800",
      diretor: "bg-blue-100 text-blue-800",
      gerente: "bg-green-100 text-green-800",
      corretor: "bg-gray-100 text-gray-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getAvailableManagers = () => {
    switch (userForm.role) {
      case "gerente":
        return directors
      case "corretor":
        return managers
      default:
        return []
    }
  }

  const getUserStats = () => {
    const stats = users.reduce(
      (acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      marketing_adm: stats.marketing_adm || 0,
      diretor: stats.diretor || 0,
      gerente: stats.gerente || 0,
      corretor: stats.corretor || 0,
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (user?.role !== "marketing_adm") {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Você não tem permissão para acessar esta página.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const stats = getUserStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Acesso</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>

        <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Senha Temporária *</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="O usuário deverá alterar no primeiro acesso"
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Cargo *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: any) => {
                    setUserForm((prev) => ({ ...prev, role: value, manager_id: "" }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          {USER_ROLE_LABELS[role]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo condicional para hierarquia */}
              {(userForm.role === "gerente" || userForm.role === "corretor") && (
                <div>
                  <Label htmlFor="manager_id">
                    {userForm.role === "gerente" ? "Diretor Responsável" : "Gerente Responsável"}
                    {userForm.role === "gerente" ? " (Opcional)" : " *"}
                  </Label>
                  <Select
                    value={userForm.manager_id}
                    onValueChange={(value) => setUserForm((prev) => ({ ...prev, manager_id: value }))}
                    required={userForm.role === "corretor"}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          userForm.role === "gerente" ? "Selecione um diretor (opcional)" : "Selecione um gerente"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableManagers().map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} - {USER_ROLE_LABELS[manager.role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Usuário</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.marketing_adm}</p>
                <p className="text-sm text-gray-600">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.diretor}</p>
                <p className="text-sm text-gray-600">Diretores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.gerente}</p>
                <p className="text-sm text-gray-600">Gerentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.corretor}</p>
                <p className="text-sm text-gray-600">Corretores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription>Lista completa de usuários com suas respectivas hierarquias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Hierarquia</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>{USER_ROLE_LABELS[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.manager ? (
                        <div className="text-sm">
                          <span className="text-gray-600">Reporta para:</span>
                          <br />
                          <span className="font-medium">{user.manager.name}</span>
                          <br />
                          <Badge variant="outline" className="text-xs">
                            {USER_ROLE_LABELS[user.manager.role]}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Nível superior</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        {user.role !== "marketing_adm" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Nome Completo *</Label>
                <Input
                  id="edit_name"
                  value={userForm.name}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_email">E-mail *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_role">Cargo *</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: any) => {
                  setUserForm((prev) => ({ ...prev, role: value, manager_id: "" }))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {USER_ROLE_LABELS[role]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo condicional para hierarquia */}
            {(userForm.role === "gerente" || userForm.role === "corretor") && (
              <div>
                <Label htmlFor="edit_manager_id">
                  {userForm.role === "gerente" ? "Diretor Responsável" : "Gerente Responsável"}
                  {userForm.role === "gerente" ? " (Opcional)" : " *"}
                </Label>
                <Select
                  value={userForm.manager_id}
                  onValueChange={(value) => setUserForm((prev) => ({ ...prev, manager_id: value }))}
                  required={userForm.role === "corretor"}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        userForm.role === "gerente" ? "Selecione um diretor (opcional)" : "Selecione um gerente"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableManagers().map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} - {USER_ROLE_LABELS[manager.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
