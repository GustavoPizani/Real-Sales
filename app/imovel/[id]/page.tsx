"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Loader2, Send, Sparkles } from "lucide-react"
import { type Imovel as Property } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function PublicPropertyViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [brokerId, setBrokerId] = useState<string | null>(null)

  const [leadName, setLeadName] = useState("")
  const [leadEmail, setLeadEmail] = useState("")
  const [leadPhone, setLeadPhone] = useState("")
  const [leadMessage, setLeadMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const bId = searchParams.get('brokerId')
    if (bId) setBrokerId(bId)
  }, [searchParams])

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/public/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error("Imóvel não encontrado ou não está mais disponível.");
      }
      const data = await response.json();
      setProperty(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar imóvel", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty])

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerId || !propertyId) {
      toast({ variant: "destructive", title: "Erro de configuração", description: "Não foi possível identificar o corretor." });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: leadName, email: leadEmail, phone: leadPhone, message: leadMessage, propertyId, brokerId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao enviar seu contato.");
      }
      toast({ title: "Contato enviado com sucesso!", description: "O corretor responsável entrará em contato em breve." });
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setLeadMessage("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao enviar contato", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      Disponivel: "bg-green-100 text-green-800",
      Reservado: "bg-yellow-100 text-yellow-800",
      Vendido: "bg-red-100 text-red-800",
      LANCAMENTO: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-6 w-6 animate-spin" /></div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Imóvel não encontrado</h2>
          <p className="text-muted-foreground">O link pode estar incorreto ou o imóvel não está mais disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{property.titulo}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{property.endereco}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <main className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-0">
                <img src={property.imagens?.[selectedImage]?.url || "/placeholder.jpg"} alt={property.titulo} className="w-full h-[500px] object-cover rounded-t-lg" />
                {property.imagens && property.imagens.length > 1 && (
                  <div className="p-4 bg-gray-50 rounded-b-lg">
                    <div className="flex gap-2 overflow-x-auto">
                      {property.imagens.map((image, index) => (
                        <button key={image.id} onClick={() => setSelectedImage(index)} className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedImage === index ? "border-primary-custom scale-105" : "border-gray-300 hover:border-primary-custom"}`}>
                          <img src={image.url} alt={`${property.titulo} ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✅ --- CARD DE DESCRIÇÃO SUBSTITUÍDO POR FEATURES --- ✅ */}
            {property.features && property.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-amber-500" />
                    Características e Lazer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {property.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-base font-normal px-3 py-1">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader><CardTitle className="text-2xl">Opções de Plantas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipologia</TableHead><TableHead>Área</TableHead><TableHead>Quartos</TableHead><TableHead>Suítes</TableHead><TableHead>Vagas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.tipologias?.map((typology) => (
                      <TableRow key={typology.id}>
                        <TableCell className="font-medium">{typology.nome}</TableCell>
                        <TableCell>{typology.area}m²</TableCell>
                        <TableCell>{typology.dormitorios}</TableCell>
                        <TableCell>{typology.suites}</TableCell>
                        <TableCell>{typology.vagas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-8 self-start">
            <Card className="shadow-lg border-t-4 border-t-primary-custom">
              <CardHeader className="text-center"><CardTitle>Fale com um especialista</CardTitle><p className="text-sm text-muted-foreground pt-1">Preencha o formulário e receba um contacto.</p></CardHeader>
              <CardContent className="pt-2">
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div><Label htmlFor="name">Nome completo</Label><Input id="name" placeholder="Seu nome" required value={leadName} onChange={(e) => setLeadName(e.target.value)} /></div>
                  <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" placeholder="seu@email.com" required value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} /></div>
                  <div><Label htmlFor="phone">Telefone / WhatsApp</Label><Input id="phone" placeholder="(XX) XXXXX-XXXX" required value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} /></div>
                  <div><Label htmlFor="message">Mensagem <span className="text-xs text-muted-foreground">(Opcional)</span></Label><Textarea id="message" placeholder="Olá, tenho interesse neste imóvel e gostaria de mais informações." value={leadMessage} onChange={(e) => setLeadMessage(e.target.value)} /></div>
                  <Button type="submit" size="lg" className="w-full bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {isSubmitting ? "Enviando..." : "Quero mais informações"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}