"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Upload, X, Save, Plus, Trash2 } from "lucide-react"

interface Typology {
  id: string
  name: string
  value: number
  description: string
}

interface ChangeLog {
  id: string
  field: string
  oldValue: any
  newValue: any
  timestamp: string
  user: string
}

export default function NewPropertyPage() {
  const router = useRouter()

  // Estados do formulário
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("")
  const [address, setAddress] = useState("")
  const [bedrooms, setBedrooms] = useState("")
  const [bathrooms, setBathrooms] = useState("")
  const [area, setArea] = useState("")
  const [status, setStatus] = useState("available")
  const [images, setImages] = useState<string[]>([])
  const [typologies, setTypologies] = useState<Typology[]>([])
  const [developerName, setDeveloperName] = useState("")
  const [partnershipManager, setPartnershipManager] = useState("")

  // Estados de controle
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [changeLog, setChangeLog] = useState<ChangeLog[]>([])
  const [saving, setSaving] = useState(false)

  // Auto-save com debounce
  const autoSave = useCallback(async () => {
    if (!title.trim()) return

    setAutoSaving(true)

    const draftData = {
      title,
      description,
      type,
      address,
      bedrooms,
      bathrooms,
      area,
      status,
      images,
      typologies,
      developerName,
      partnershipManager,
      timestamp: new Date().toISOString(),
    }

    // Salva no localStorage como backup
    localStorage.setItem("property-draft-new", JSON.stringify(draftData))

    // Simula salvamento no servidor
    await new Promise((resolve) => setTimeout(resolve, 500))

    setAutoSaving(false)
    setLastSaved(new Date())
  }, [
    title,
    description,
    type,
    address,
    bedrooms,
    bathrooms,
    area,
    status,
    images,
    typologies,
    developerName,
    partnershipManager,
  ])

  // Debounce do auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [autoSave])

  // Carrega rascunho salvo
  useEffect(() => {
    const savedDraft = localStorage.getItem("property-draft-new")
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setTitle(draft.title || "")
        setDescription(draft.description || "")
        setType(draft.type || "")
        setAddress(draft.address || "")
        setBedrooms(draft.bedrooms || "")
        setBathrooms(draft.bathrooms || "")
        setArea(draft.area || "")
        setStatus(draft.status || "available")
        setImages(draft.images || [])
        setTypologies(draft.typologies || [])
        setDeveloperName(draft.developerName || "")
        setPartnershipManager(draft.partnershipManager || "")
        setLastSaved(new Date(draft.timestamp))
      } catch (error) {
        console.error("Erro ao carregar rascunho:", error)
      }
    }
  }, [])

  // Upload de imagens
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadingImages(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Simula upload - em produção, usar serviço real como Vercel Blob
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return URL.createObjectURL(file)
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setImages((prev) => [...prev, ...uploadedUrls])

      logChange("images", images, [...images, ...uploadedUrls])
    } catch (error) {
      console.error("Erro no upload:", error)
    } finally {
      setUploadingImages(false)
    }
  }

  // Remove imagem
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    logChange("images", images, newImages)
  }

  // Adiciona tipologia
  const addTypology = () => {
    const newTypology: Typology = {
      id: Date.now().toString(),
      name: "",
      value: 0,
      description: "",
    }
    setTypologies((prev) => [...prev, newTypology])
  }

  // Remove tipologia
  const removeTypology = (id: string) => {
    const newTypologies = typologies.filter((t) => t.id !== id)
    setTypologies(newTypologies)
    logChange("typologies", typologies, newTypologies)
  }

  // Atualiza tipologia
  const updateTypology = (id: string, field: keyof Typology, value: any) => {
    const newTypologies = typologies.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    setTypologies(newTypologies)
    logChange(`typology.${field}`, typologies, newTypologies)
  }

  // Log de mudanças
  const logChange = (field: string, oldValue: any, newValue: any) => {
    const change: ChangeLog = {
      id: Date.now().toString(),
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      user: "Usuário Atual",
    }
    setChangeLog((prev) => [change, ...prev].slice(0, 50))
  }

  // Salva propriedade
  const handleSave = async () => {
    setSaving(true)

    try {
      const propertyData = {
        title,
        description,
        type,
        address,
        bedrooms: Number.parseInt(bedrooms) || 0,
        bathrooms: Number.parseInt(bathrooms) || 0,
        area: Number.parseFloat(area) || 0,
        status,
        images,
        typologies,
        developerName,
        partnershipManager,
      }

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(propertyData),
      })

      if (response.ok) {
        // Limpa o rascunho
        localStorage.removeItem("property-draft-new")
        router.push("/properties")
      } else {
        throw new Error("Erro ao salvar propriedade")
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert("Erro ao salvar propriedade. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Novo Imóvel</h1>
          <p className="text-muted-foreground">Cadastre um novo empreendimento imobiliário</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Indicador de auto-save */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {autoSaving ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-4 w-4" />
                Salvo {lastSaved.toLocaleTimeString()}
              </>
            ) : null}
          </div>

          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : "Salvar Imóvel"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      logChange("title", title, e.target.value)
                      setTitle(e.target.value)
                    }}
                    placeholder="Ex: Residencial Vista Alegre"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={type}
                    onValueChange={(value) => {
                      logChange("type", type, value)
                      setType(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="cobertura">Cobertura</SelectItem>
                      <SelectItem value="terreno">Terreno</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="empreendimento">Empreendimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    logChange("description", description, e.target.value)
                    setDescription(e.target.value)
                  }}
                  placeholder="Descreva as características do imóvel..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => {
                    logChange("address", address, e.target.value)
                    setAddress(e.target.value)
                  }}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={bedrooms}
                    onChange={(e) => {
                      logChange("bedrooms", bedrooms, e.target.value)
                      setBedrooms(e.target.value)
                    }}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={bathrooms}
                    onChange={(e) => {
                      logChange("bathrooms", bathrooms, e.target.value)
                      setBathrooms(e.target.value)
                    }}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    step="0.01"
                    value={area}
                    onChange={(e) => {
                      logChange("area", area, e.target.value)
                      setArea(e.target.value)
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Construtora */}
          <Card>
            <CardHeader>
              <CardTitle>Construtora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="developer">Nome da Construtora</Label>
                  <Input
                    id="developer"
                    value={developerName}
                    onChange={(e) => {
                      logChange("developerName", developerName, e.target.value)
                      setDeveloperName(e.target.value)
                    }}
                    placeholder="Ex: Construtora ABC"
                  />
                </div>

                <div>
                  <Label htmlFor="manager">Gerente de Parceria</Label>
                  <Input
                    id="manager"
                    value={partnershipManager}
                    onChange={(e) => {
                      logChange("partnershipManager", partnershipManager, e.target.value)
                      setPartnershipManager(e.target.value)
                    }}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipologias */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tipologias</CardTitle>
                <Button onClick={addTypology} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tipologia
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {typologies.map((typology, index) => (
                <div key={typology.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Tipologia {index + 1}</h4>
                    <Button variant="outline" size="sm" onClick={() => removeTypology(typology.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome da Tipologia</Label>
                      <Input
                        value={typology.name}
                        onChange={(e) => updateTypology(typology.id, "name", e.target.value)}
                        placeholder="Ex: 2 Quartos"
                      />
                    </div>

                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={typology.value}
                        onChange={(e) => updateTypology(typology.id, "value", Number.parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {typologies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma tipologia adicionada</p>
                  <p className="text-sm">Clique em "Adicionar Tipologia" para começar</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload de Imagens */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="images">Upload de Imagens</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                  />
                  {uploadingImages && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <Upload className="h-4 w-4 inline mr-2" />
                      Fazendo upload das imagens...
                    </p>
                  )}
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={status}
                onValueChange={(value) => {
                  logChange("status", status, value)
                  setStatus(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="construction">Em Construção</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Histórico de Alterações */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {changeLog.length > 0 ? (
                  changeLog.map((change) => (
                    <div key={change.id} className="text-sm border-l-2 border-blue-200 pl-3 py-2">
                      <div className="font-medium">{change.field}</div>
                      <div className="text-muted-foreground text-xs">{new Date(change.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração registrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
