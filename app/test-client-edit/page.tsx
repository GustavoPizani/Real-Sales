"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Shield, Users, AlertCircle } from "lucide-react"

interface Client {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  assignedTo: string
  assignedToName: string
}

const mockUsers = [
  { id: "1", name: "Admin Sistema", email: "admin@realsales.com", role: "admin" },
  { id: "2", name: "João Diretor", email: "joao@realsales.com", role: "diretor" },
  { id: "3", name: "Maria Gerente", email: "maria@realsales.com", role: "gerente" },
  { id: "4", name: "Pedro Corretor", email: "pedro@realsales.com", role: "corretor" },
  { id: "5", name: "Ana Corretora", email: "ana@realsales.com", role: "corretor" },
]

const mockClient = {
  id: "1",
  name: "Cliente Teste",
  phone: "(11) 99999-9999",
  email: "cliente@teste.com",
  notes: "Cliente interessado em apartamento de 2 quartos",
  assignedTo: "4",
  assignedToName: "Pedro Corretor",
}

export default function TestClientEditPage() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0])
  const [client, setClient] = useState(mockClient)
  const [editFormData, setEditFormData] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email,
    notes: client.notes,
  })
  const [assignFormData, setAssignFormData] = useState({
    newAssignedTo: client.assignedTo,
  })
  const [testLog, setTestLog] = useState<string[]>([])
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)

  const addLog = (message: string, type: "success" | "error" | "info" = "info") => {
    const timestamp = new Date().toLocaleTimeString()
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"
    setTestLog((prev) => [`${icon} [${timestamp}] ${message}`, ...prev])
  }

  const canEdit = (userRole: string, clientAssignedTo: string, userId: string) => {
    if (userRole === "admin" || userRole === "diretor") return true
    if (userRole === "gerente") return true // Gerente pode editar qualquer cliente
    if (userRole === "corretor" && clientAssignedTo === userId) return true
    return false
  }

  const canAssign = (userRole: string) => {
    return ["admin", "diretor", "gerente"].includes(userRole)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editFormData.name.trim()) {
      addLog("Erro: Nome é obrigatório", "error")
      return
    }

    if (editFormData.email && !editFormData.email.includes("@")) {
      addLog("Erro: Email inválido", "error")
      return
    }

    try {
      // Simular chamada à API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setClient((prev) => ({
        ...prev,
        ...editFormData,
      }))

      addLog(`Cliente "${editFormData.name}" editado com sucesso por ${currentUser.name}`, "success")
      setIsEditOpen(false)
    } catch (error) {
      addLog("Erro ao editar cliente", "error")
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (assignFormData.newAssignedTo === client.assignedTo) {
      addLog("Erro: Cliente já está atribuído a este corretor", "error")
      return
    }

    try {
      // Simular chamada à API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newAssignedUser = mockUsers.find((u) => u.id === assignFormData.newAssignedTo)
      const oldAssignedUser = mockUsers.find((u) => u.id === client.assignedTo)

      setClient((prev) => ({
        ...prev,
        assignedTo: assignFormData.newAssignedTo,
        assignedToName: newAssignedUser?.name || "",
        notes:
          prev.notes +
          `\n\n[${new Date().toLocaleString()}] Cliente transferido de ${oldAssignedUser?.name} para ${newAssignedUser?.name} por ${currentUser.name}`,
      }))

      addLog(`Cliente atribuído a ${newAssignedUser?.name} por ${currentUser.name}`, "success")
      setIsAssignOpen(false)
    } catch (error) {
      addLog("Erro ao atribuir cliente", "error")
    }
  }

  const testPermissions = () => {
    addLog("=== TESTE DE PERMISSÕES ===", "info")
    mockUsers.forEach((user) => {
      const canEditResult = canEdit(user.role, client.assignedTo, user.id)
      const canAssignResult = canAssign(user.role)
      addLog(
        `${user.name} (${user.role}): Editar=${canEditResult ? "✅" : "❌"}, Atribuir=${canAssignResult ? "✅" : "❌"}`,
      )
    })
  }

  const testValidations = async () => {
    addLog("=== TESTE DE VALIDAÇÕES ===", "info")

    // Teste 1: Nome vazio
    const originalName = editFormData.name
    setEditFormData((prev) => ({ ...prev, name: "" }))
    addLog("Testando nome vazio...")
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Teste 2: Email inválido
    setEditFormData((prev) => ({ ...prev, name: originalName, email: "email-invalido" }))
    addLog("Testando email inválido...")
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Teste 3: Dados válidos
    setEditFormData((prev) => ({ ...prev, email: "email@valido.com" }))
    addLog("Testando dados válidos...")
    await new Promise((resolve) => setTimeout(resolve, 500))

    addLog("Testes de validação concluídos", "success")
  }

  const resetForm = () => {
    setEditFormData({
      name: client.name,
      phone: client.phone,
      email: client.email,
      notes: client.notes,
    })
    setAssignFormData({
      newAssignedTo: client.assignedTo,
    })
    addLog("Formulários resetados", "info")
  }

  const clearLog = () => {
    setTestLog([])
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "diretor":
        return <Users className="h-4 w-4" />
      case "gerente":
        return <Users className="h-4 w-4" />
      case "corretor":
        return <Users className="h-4 w-4" />
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "diretor":
        return "bg-purple-100 text-purple-800"
      case "gerente":
        return "bg-blue-100 text-blue-800"
      case "corretor":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teste - Edição de Cliente</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          Ambiente de Teste
        </Badge>
      </div>

      {/* Controles de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Controles de Teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Usuário Atual</Label>
              <Select
                value={currentUser.id}
                onValueChange={(value) => {
                  const user = mockUsers.find((u) => u.id === value)
                  if (user) {
                    setCurrentUser(user)
                    addLog(`Usuário alterado para: ${user.name} (${user.role})`)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        {user.name} - {user.role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={testPermissions} variant="outline">
                Testar Permissões
              </Button>
              <Button onClick={testValidations} variant="outline">
                Testar Validações
              </Button>
              <Button onClick={resetForm} variant="outline">
                Reset Formulário
              </Button>
              <Button onClick={clearLog} variant="outline">
                Limpar Log
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getRoleIcon(currentUser.role)}
              <span className="font-medium">{currentUser.name}</span>
              <Badge className={getRoleBadgeColor(currentUser.role)}>{currentUser.role}</Badge>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                {canEdit(currentUser.role, client.assignedTo, currentUser.id) ? (
                  <Users className="h-4 w-4 text-green-600" />
                ) : (
                  <Users className="h-4 w-4 text-red-600" />
                )}
                <span>Pode Editar</span>
              </div>
              <div className="flex items-center gap-1">
                {canAssign(currentUser.role) ? (
                  <Users className="h-4 w-4 text-green-600" />
                ) : (
                  <Users className="h-4 w-4 text-red-600" />
                )}
                <span>Pode Atribuir</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {client.name}
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canEdit(currentUser.role, client.assignedTo, currentUser.id)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Editar Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Salvar Alterações</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!canAssign(currentUser.role)}>
                    <Users className="h-4 w-4 mr-2" />
                    Atribuir Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Atribuir Cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAssignSubmit} className="space-y-4">
                    <div>
                      <Label>Corretor Atual</Label>
                      <div className="p-2 bg-gray-50 rounded">{client.assignedToName}</div>
                    </div>
                    <div>
                      <Label htmlFor="newAssignedTo">Novo Corretor</Label>
                      <Select
                        value={assignFormData.newAssignedTo}
                        onValueChange={(value) => setAssignFormData((prev) => ({ ...prev, newAssignedTo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mockUsers
                            .filter((u) => u.role === "corretor")
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Atribuir Cliente</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Telefone</Label>
              <p>{client.phone}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <p>{client.email}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-500">Corretor Responsável</Label>
              <p>{client.assignedToName}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-500">Observações</Label>
              <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap">{client.notes}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log de Testes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Log de Testes</span>
            <Badge variant="secondary">{testLog.length} entradas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {testLog.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum teste executado ainda</p>
            ) : (
              testLog.map((log, index) => (
                <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
