// app/(app)/properties/[id]/edit/page.tsx

"use client";

import React from "react";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, Trash2, Upload, X, Share2, Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { type Imovel, type TipologiaImovel, StatusImovel } from "@prisma/client";

type PropertyWithDetails = Imovel & {
  tipologias: TipologiaImovel[];
  imagens: { id: string; url: string }[];
};

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados do formulário
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<StatusImovel>(StatusImovel.Disponivel);
  const [images, setImages] = useState<{ file?: File; url: string }[]>([]);
  const [typologies, setTypologies] = useState<Partial<TipologiaImovel>[]>([]);

  // Estados do Modal de Compartilhamento
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;

  // Carrega dados da API
  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      // O cookie de autenticação é enviado automaticamente pelo navegador.
      const response = await fetch(`/api/properties/${propertyId}`);
      if (!response.ok) throw new Error("Imóvel não encontrado");

      const data = await response.json();
      
      // CORREÇÃO: Mapeia os dados recebidos da API para os estados do formulário.
      setTitle(data.title);
      setDescription(data.description || "");
      setAddress(data.address || "");
      setType(data.type || "Empreendimento");
      setStatus(data.status);
      setTypologies(data.typologies || []); // A API já retorna no formato correto
      setImages(data.images || []); // A API já retorna no formato { id, url }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Erro ao carregar imóvel",
        description: errorMessage,
      });
      router.push("/properties");
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast, router]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Efeito para limpar os Object URLs das imagens para evitar memory leaks
  useEffect(() => {
    const objectUrls = images.map(image => image.url).filter(url => typeof url === 'string' && url.startsWith('blob:'));
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const propertyData = {
        title,
        description,
        address,
        type,
        status,
        typologies: typologies.map(({ id, imovelId, ...rest }: Partial<TipologiaImovel>) => rest),
        imageUrls: images.map(img => img.url), // Apenas envia as URLs
      };

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) throw new Error("Falha ao guardar as alterações.");

      toast({ title: "Sucesso!", description: "Imóvel atualizado com sucesso." });
      router.push(`/properties/${propertyId}/view`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Erro ao guardar",
        description: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedImages: { url: string }[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", { method: "POST", body: formData });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Falha ao carregar a imagem: ${file.name}`);
        }
        const result = await response.json();
        uploadedImages.push({ url: result.url });
      }
      setImages((prev) => [...prev, ...uploadedImages]);
      toast({ title: "Sucesso!", description: "Imagens carregadas." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no Upload",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleShareClick = () => {
    if (user && propertyId) {
      const link = `${window.location.origin}/public/properties/${propertyId}?brokerId=${user.id}`;
      setShareableLink(link);
      setIsShareModalOpen(true);
    }
  };

  const copyToClipboard = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    toast({ title: "Sucesso!", description: "Link copiado!" });
  };

  // Funções de gestão do formulário
  const addTypology = () => setTypologies(prev => [...prev, { id: `temp-${Date.now()}`, nome: '', valor: 0, dormitorios: 0, suites: 0, vagas: 0, area: 0 }]);
  const removeTypology = (id: string) => setTypologies(prev => prev.filter(t => t.id !== id));
  const updateTypology = (id: string, field: keyof TipologiaImovel, value: any) => {
      setTypologies(prev =>
        prev.map(t =>
          t.id === id ? { ...t, [field]: value } : t
        )
      );
  };
  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p>A carregar dados do imóvel...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(`/properties/${propertyId}/view`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Empreendimento</h1>
            <p className="text-gray-600">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleShareClick}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Nome do Empreendimento</Label>
                <Input id="title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* Tipologias */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipologias</CardTitle>
              <Button onClick={addTypology} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {typologies.map((typology: Partial<TipologiaImovel>) => (
                <Card key={typology.id} className="p-4">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeTypology(typology.id!)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input value={typology.nome ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, "nome", e.target.value)} />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input type="number" value={typology.valor ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, "valor", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div><Label>Dorms</Label><Input type="number" value={typology.dormitorios ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, 'dormitorios', parseInt(e.target.value, 10) || 0)} /></div>
                      <div><Label>Suítes</Label><Input type="number" value={typology.suites ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, 'suites', parseInt(e.target.value, 10) || 0)} /></div>
                      <div><Label>Vagas</Label><Input type="number" value={typology.vagas ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, 'vagas', parseInt(e.target.value, 10) || 0)} /></div>
                      <div><Label>Área (m²)</Label><Input type="number" value={typology.area ?? 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTypology(typology.id!, 'area', parseFloat(e.target.value) || 0)} /></div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={status} onValueChange={(value: StatusImovel) => setStatus(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatusImovel.Disponivel}>Disponível</SelectItem>
                  <SelectItem value={StatusImovel.Reservado}>Reservado</SelectItem>
                  <SelectItem value={StatusImovel.Vendido}>Vendido</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Imagens</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="image-upload" className={`w-full inline-block cursor-pointer text-center p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 ${uploading ? 'cursor-not-allowed bg-gray-100' : ''}`}>
                {uploading ? <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" /> : <Upload className="mx-auto h-8 w-8 text-gray-400" />}
                <span>{uploading ? 'A carregar...' : 'Subir fotos'}</span>
              </Label>
              <Input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              <div className="grid grid-cols-2 gap-2 mt-4">
                {images.map((image, index) => (
                  <div key={image.url} className="relative group">
                    <img src={image.url} alt={`Imagem ${index + 1}`} className="w-full h-20 object-cover rounded" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Imóvel</DialogTitle>
            <DialogDescription>
              Copie o link abaixo e envie para o seu cliente. Ele verá uma página pública com os detalhes do imóvel e um formulário para entrar em contacto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input value={shareableLink} readOnly />
            <Button type="button" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setIsShareModalOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
