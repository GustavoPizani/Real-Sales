"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings2, Globe, Facebook } from "lucide-react"

interface FieldMapping {
  field_name: string
  mapped_field: string
}

const defaultFields = [
  { field_name: "full_name", label: "Nome Completo", description: "Nome completo do cliente" },
  { field_name: "email", label: "E-mail", description: "Endereço de e-mail do cliente" },
  { field_name: "phone", label: "Telefone", description: "Número de telefone do cliente" },
  { field_name: "notes", label: "Observações", description: "Mensagem ou observações adicionais" },
]

export default function AdsPage() {
  const { user } = useAuth()
  const [siteMappings, setSiteMappings] = useState<FieldMapping[]>([])
  const [facebookMappings, setFacebookMappings] = useState<FieldMapping[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === "marketing_adm") {
      loadMappings()
    }
  }, [user])

  const loadMappings = async () => {
    try {
      setLoading(true)

      // Carregar mapeamentos do site
      const siteResponse = await fetch("/api/field-mappings?source=site")
      if (siteResponse.ok) {
        const siteData = await siteResponse.json()
        setSiteMappings(siteData)
      }

      // Carregar mapeamentos do Facebook
      const facebookResponse = await fetch("/api/field-mappings?source=facebook")
      if (facebookResponse.ok) {
        const facebookData = await facebookResponse.json()
        setFacebookMappings(facebookData)
      }
    } catch (error) {
      console.error("Erro ao carregar mapeamentos:", error)
      setMessage("Erro ao carregar mapeamentos de campos.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMappings = async (source: "site" | "facebook") => {
    try {
      const mappings = source === "site" ? siteMappings : facebookMappings

      const response = await fetch("/api/field-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mappings, source }),
      })

      if (response.ok) {
        setMessage(`Mapeamentos do ${source === "site" ? "site" : "Facebook"} salvos com sucesso!`)
      } else {
        setMessage("Erro ao salvar mapeamentos.")
      }
    } catch (error) {
      setMessage("Erro ao salvar mapeamentos.")
    }

    setTimeout(() => setMessage(""), 3000)
  }

  const updateMapping = (source: "site" | "facebook", fieldName: string, mappedField: string) => {
    if (source === "site") {
      setSiteMappings((prev) => {
        const existing = prev.find((m) => m.field_name === fieldName)
        if (existing) {
          return prev.map((m) => (m.field_name === fieldName ? { ...m, mapped_field: mappedField } : m))
        } else {
          return [...prev, { field_name: fieldName, mapped_field: mappedField }]
        }
      })
    } else {
      setFacebookMappings((prev) => {
        const existing = prev.find((m) => m.field_name === fieldName)
        if (existing) {
          return prev.map((m) => (m.field_name === fieldName ? { ...m, mapped_field: mappedField } : m))
        } else {
          return [...prev, { field_name: fieldName, mapped_field: mappedField }]
        }
      })
    }
  }

  const getMappedValue = (source: "site" | "facebook", fieldName: string) => {
    const mappings = source === "site" ? siteMappings : facebookMappings
    const mapping = mappings.find((m) => m.field_name === fieldName)
    return mapping?.mapped_field || ""
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-custom">Mapeamento de Campos de Formulário</h1>
        <p className="text-gray-600">Configure como os campos dos formulários externos são mapeados para o CRM</p>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="site" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="site" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Site
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook Lead Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-custom">
                <Globe className="h-5 w-5" />
                Mapeamento de Campos do Site
              </CardTitle>
              <CardDescription>
                Configure como os campos do formulário do seu site são mapeados para os campos do CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : (
                <>
                  {defaultFields.map((field) => (
                    <div key={field.field_name} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <Label className="text-primary-custom font-medium">{field.label}</Label>
                        <p className="text-sm text-gray-500">{field.description}</p>
                      </div>
                      <div>
                        <Label htmlFor={`site_${field.field_name}`}>Nome do Campo no Formulário</Label>
                        <Input
                          id={`site_${field.field_name}`}
                          value={getMappedValue("site", field.field_name)}
                          onChange={(e) => updateMapping("site", field.field_name, e.target.value)}
                          placeholder={`Ex: ${field.field_name === "full_name" ? "nome" : field.field_name === "phone" ? "telefone" : field.field_name === "notes" ? "mensagem" : field.field_name}`}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => handleSaveMappings("site")}
                      className="bg-secondary-custom hover:bg-secondary-custom/90 text-white"
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Salvar Mapeamentos do Site
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facebook">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary-custom">
                <Facebook className="h-5 w-5" />
                Mapeamento de Campos do Facebook Lead Ads
              </CardTitle>
              <CardDescription>
                Configure como os campos do Facebook Lead Ads são mapeados para os campos do CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : (
                <>
                  {defaultFields.slice(0, 3).map(
                    (
                      field, // Facebook geralmente não tem campo de notes
                    ) => (
                      <div key={field.field_name} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                          <Label className="text-primary-custom font-medium">{field.label}</Label>
                          <p className="text-sm text-gray-500">{field.description}</p>
                        </div>
                        <div>
                          <Label htmlFor={`facebook_${field.field_name}`}>Nome do Campo no Facebook</Label>
                          <Input
                            id={`facebook_${field.field_name}`}
                            value={getMappedValue("facebook", field.field_name)}
                            onChange={(e) => updateMapping("facebook", field.field_name, e.target.value)}
                            placeholder={`Ex: ${field.field_name === "phone" ? "phone_number" : field.field_name}`}
                          />
                        </div>
                      </div>
                    ),
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => handleSaveMappings("facebook")}
                      className="bg-secondary-custom hover:bg-secondary-custom/90 text-white"
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Salvar Mapeamentos do Facebook
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações sobre Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary-custom">URLs dos Webhooks</CardTitle>
          <CardDescription>Use estas URLs para configurar os webhooks em suas fontes externas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-medium">Webhook do Site</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={`${window.location.origin}/api/webhooks/site`} readOnly className="bg-gray-50" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/site`)}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div>
            <Label className="font-medium">Webhook do Facebook</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={`${window.location.origin}/api/webhooks/facebook`} readOnly className="bg-gray-50" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/facebook`)}
              >
                Copiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
