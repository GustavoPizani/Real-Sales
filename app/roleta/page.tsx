"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Users, RotateCcw } from "lucide-react"
import type { User } from "@/lib/types"

interface Roleta {
  id: string
  nome: string
  ativa: boolean
  last_assigned_index: number
  usuarios: User[]
  created_at: string
}

export default function RoletaPage() {
  const { user } = useAuth()
  const [roletas, setRoletas] = useState<Roleta[]>([])
  const [corretores, setCorretores] = useState<User[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRoleta, setEditingRoleta] = useState<Roleta | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    usuarios: [] as string[],
  })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "marketing_adm") {
      loadRoletas()
      loadCorretores()
    }
  }, [user])

  const loadRoletas = async () => {
    try {
      const response = await fetch("/api/roletas")
      if (response.ok) {
        const data = await response.json()
        setRoletas(data)
      }
    } catch (error) {
      console.error("Erro ao carregar roletas:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCorretores = async () => {
    try {
      const response = await fetch("/api/users?role=corretor")
      if (response.ok) {
        const data = await response.json()
        setCorretores(data)
      }
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
    }
  }

  const handleCreateRoleta = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.usuarios.length === 0) {
      setMessage("Selecione pelo menos um corretor para a roleta.")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    try {
      const response = await fetch("/api/roletas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage("Roleta criada com sucesso!")
        setShowCreateModal(false)
        setFormData({ nome: "", usuarios: [] })
        loadRoletas()
      } else {
        setMessage("Erro ao criar roleta.")
      }
    } catch (error) {
      setMessage("Erro ao criar roleta.")
    }

    setTimeout(() => setMessage(""), 3000)
  }

  const handleEditRoleta = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRoleta) return

    if (formData.usuarios.length === 0) {
      setMessage("Selecione pelo menos um corretor para a roleta.")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    try {
      const response = await fetch(`/api/roletas/${editingRoleta.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ativa: editingRoleta.ativa,
        }),
      })

      if (response.ok) {
        setMessage("Roleta atualizada com sucesso!")
        setEditingRoleta(null)
        setFormData({ nome: "", usuarios: [] })
        loadRoletas()
      } else {
        setMessage("Erro ao atualizar roleta.")
      }
    } catch (error) {
      setMessage("Erro ao atualizar roleta.")
    }

    setTimeout(() => setMessage(""), 3000)
  }

  const handleDeleteRoleta = async (roletaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta roleta?")) return

    try {
      const response = await fetch(`/api/roletas/${roletaId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage("Roleta excluída com sucesso!")
        loadRoletas()
      } else {
        setMessage("Erro ao excluir roleta.")
      }
    } catch (error) {
      setMessage("Erro ao excluir roleta.")
    }

    setTimeout(() => setMessage(""), 3000)
  }

  const handleToggleActive = async (roleta: Roleta) => {
    try {
      const response = await fetch(`/api/roletas/${roleta.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: roleta.nome,
          usuarios: roleta.usuarios.map((u) => u.id),
          ativa: !roleta.ativa,
        }),
      })

      if (response.ok) {
        setMessage(`Roleta ${!roleta.ativa ? "ativada" : "desativada"} com sucesso!`)
        loadRoletas()
      } else {
        setMessage("Erro ao alterar status da roleta.")
      }
    } catch (error) {
      setMessage("Erro ao alterar status da roleta.")
    }

    setTimeout(() => setMessage(""), 3000)
  }

  const openEditModal = (roleta: Roleta) => {
    setEditingRoleta(roleta)
    setFormData({
      nome: roleta.nome,
      usuarios: roleta.usuarios.map((u) => u.id),
    })
  }

  const handleUsuarioToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      usuarios: prev.usuarios.includes(userId)
        ? prev.usuarios.filter((id) => id !== userId)
        : [...prev.usuarios, userId],
    }))
  }

  if (user?.role !== "marketing_adm") {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Você não tem permissão para acessar esta página.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">Sistema de Roleta</h1>
          <p className="text-gray-600">Gerencie a distribuição automática de leads para os corretores</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Roleta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Roleta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoleta} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Roleta</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Roleta Principal"
                  required
                />
              </div>

              <div>
                <Label>Corretores Participantes</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {corretores.map((corretor) => (
                    <div key={corretor.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`corretor_${corretor.id}`}
                        checked={formData.usuarios.includes(corretor.id)}
                        onChange={() => handleUsuarioToggle(corretor.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`corretor_${corretor.id}`} className="text-sm">
                        {corretor.name} ({corretor.email})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                  Criar Roleta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-custom">
            <RotateCcw className="h-5 w-5" />
            Roletas Configuradas
          </CardTitle>
          <CardDescription>Gerencie as roletas de distribuição de leads</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : roletas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma roleta configurada. Crie sua primeira roleta para começar a distribuir leads automaticamente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Corretores</TableHead>
                    <TableHead>Último Atribuído</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roletas.map((roleta) => (
                    <TableRow key={roleta.id}>
                      <TableCell className="font-medium">{roleta.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={roleta.ativa} onCheckedChange={() => handleToggleActive(roleta)} />
                          <Badge variant={roleta.ativa ? "default" : "secondary"}>
                            {roleta.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{roleta.usuarios.length}</span>
                          <div className="ml-2">
                            {roleta.usuarios.slice(0, 3).map((usuario, index) => (
                              <Badge key={usuario.id} variant="outline" className="mr-1 text-xs">
                                {usuario.name.split(" ")[0]}
                              </Badge>
                            ))}
                            {roleta.usuarios.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{roleta.usuarios.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {roleta.usuarios.length > 0 && roleta.last_assigned_index < roleta.usuarios.length
                          ? roleta.usuarios[roleta.last_assigned_index]?.name || "N/A"
                          : "Nenhum"}
                      </TableCell>
                      <TableCell>{new Date(roleta.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(roleta)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRoleta(roleta.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={!!editingRoleta} onOpenChange={() => setEditingRoleta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Roleta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRoleta} className="space-y-4">
            <div>
              <Label htmlFor="edit_nome">Nome da Roleta</Label>
              <Input
                id="edit_nome"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Corretores Participantes</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {corretores.map((corretor) => (
                  <div key={corretor.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit_corretor_${corretor.id}`}
                      checked={formData.usuarios.includes(corretor.id)}
                      onChange={() => handleUsuarioToggle(corretor.id)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`edit_corretor_${corretor.id}`} className="text-sm">
                      {corretor.name} ({corretor.email})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingRoleta(null)}>
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
  )
}
