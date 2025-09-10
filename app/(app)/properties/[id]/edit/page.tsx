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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ClipboardPaste, Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { type TipologiaImovel, type ImagemPlanta, StatusImovel } from "@prisma/client";

type TypologyWithPlanta = Partial<TipologiaImovel> & {
  plantaFile?: File;
  plantaPreview?: string;
  plantas?: ImagemPlanta[];
};

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<StatusImovel>(StatusImovel.Disponivel);
  const [images, setImages] = useState<{ url: string }[]>([]);
  const [typologies, setTypologies] = useState<TypologyWithPlanta[]>([]);
  const [features, setFeatures] = useState<string[]>([]); // ✅ Adicionado

  // ✅ --- NOVOS ESTADOS PARA IMPORTAÇÃO DE TEXTO --- ✅
  const [isParseTextModalOpen, setIsParseTextModalOpen] = useState(false);
  const [textToParse, setTextToParse] = useState("");
  const [isParsingText, setIsParsingText] = useState(false);
  const [parsedTypologies, setParsedTypologies] = useState<any | null>(null);

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const fetchProperty = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}`);
      if (!response.ok) throw new Error("Imóvel não encontrado");
      const data = await response.json();
      setTitle(data.title);
      setAddress(data.address || "");
      setType(data.type || "Empreendimento");
      setStatus(data.status);
      setTypologies(data.typologies || []);
      setImages(data.images || []);
      setFeatures(data.features || []); // ✅ Adicionado
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar imóvel", description: error.message });
      router.push("/properties");
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast, router]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  useEffect(() => {
    const objectUrls = images.map(image => image.url).filter(url => typeof url === 'string' && url.startsWith('blob:'));
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  // ✅ --- NOVA FUNÇÃO PARA ANALISAR O TEXTO COLADO ---
  const handleParseFromText = async () => {
    if (!textToParse.trim()) return;
    setIsParsingText(true);
    try {
      const response = await fetch('/api/parse-typologies', { // Chama a nova API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Não foi possível analisar o texto.");
      }

      const data = await response.json();

      if (!data.typologies || data.typologies.length === 0) {
        toast({
          variant: "destructive",
          title: "Nenhuma tipologia encontrada",
          description: "A IA não conseguiu extrair dados do texto fornecido.",
        });
        return;
      }

      setParsedTypologies(data); // Salva os dados para o modal de confirmação
      setIsParseTextModalOpen(false); // Fecha o modal de colar texto
      setTextToParse(""); // Limpa o campo de texto

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na Análise", description: error.message });
    } finally {
      setIsParsingText(false);
    }
  };

  const handleConfirmTypologyUpdate = () => {
    if (!parsedTypologies || !parsedTypologies.typologies) return;
    const newTypologies = parsedTypologies.typologies.map((t: any) => {
      if (!t || Object.keys(t).length === 0) {
        return null;
      }
      return {
        nome: t.nome || '',
        valor: parseFloat(t.valor) || 0,
        area: parseFloat(t.area) || 0,
        dormitorios: parseInt(t.dormitorios, 10) || 0,
        suites: parseInt(t.suites, 10) || 0,
        vagas: parseInt(t.vagas, 10) || 0,
        id: `temp-${Date.now()}-${Math.random()}`,
        plantas: [],
      };
    }).filter(Boolean);
    setTypologies(newTypologies as TypologyWithPlanta[]);
    toast({ title: "Sucesso!", description: "As tipologias foram atualizadas." });
    setParsedTypologies(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const typologiesWithPlantaUrls = await Promise.all(
        typologies.map(async (typology) => {
          if (typology.plantaFile) {
            const formData = new FormData();
            formData.append("file", typology.plantaFile);
            const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
            if (!uploadResponse.ok) throw new Error(`Falha no upload da planta para ${typology.nome}.`);
            const { url } = await uploadResponse.json();
            const newPlanta = { url };
            const existingPlantas = typology.plantas ? typology.plantas.map(p => ({ url: p.url })) : [];
            return { ...typology, plantas: [...existingPlantas, newPlanta] };
          }
          return typology;
        })
      );

      const propertyData = {
        title,
        address,
        type,
        status,
        features, // ✅ Adicionado
        typologies: typologiesWithPlantaUrls.map(({ id, imovelId, plantaFile, plantaPreview, ...rest }) => rest),
        imageUrls: images.map(img => img.url),
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

  const addTypology = () => setTypologies(prev => [...prev, { id: `temp-${Date.now()}`, nome: '', valor: 0, dormitorios: 0, suites: 0, vagas: 0, area: 0, plantas: [] }]);
  const removeTypology = (id: string) => setTypologies(prev => prev.filter(t => t.id !== id));
  const updateTypology = (id: string, field: keyof TipologiaImovel, value: any) => {
    setTypologies(prev =>
      prev.map(t =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  };
  const handlePlantaImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newTypologies = [...typologies];
      newTypologies[index].plantaFile = file;
      newTypologies[index].plantaPreview = URL.createObjectURL(file);
      setTypologies(newTypologies);
    }
  };
  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  if (loading) {
    return <div className="flex h-full items-center justify-center p-6"><p>A carregar dados do imóvel...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
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
          <Button onClick={handleSave} disabled={saving || uploading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="title">Nome do Empreendimento</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label htmlFor="address">Endereço</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              {/* ✅ --- CAMPO DE DESCRIÇÃO SUBSTITUÍDO POR FEATURES --- ✅ */}
              <div>
                <Label htmlFor="features">Características Condominiais (separadas por vírgula)</Label>
                <Textarea
                    id="features"
                    value={features.join(', ')}
                    onChange={(e) => setFeatures(e.target.value.split(',').map(item => item.trim()))}
                    placeholder="Brinquedoteca, Churrasqueira, Elevador social..."
                    rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipologias</CardTitle>
              {/* ✅ --- O CÓDIGO DO BOTÃO ESTÁ AQUI --- ✅ */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* ✅ --- BOTÃO E MODAL PARA IMPORTAR TEXTO --- ✅ */}
                <Dialog open={isParseTextModalOpen} onOpenChange={setIsParseTextModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ClipboardPaste className="h-4 w-4 mr-2" />
                      Importar de Texto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Importar Tipologias de Texto</DialogTitle></DialogHeader>
                    <DialogDescription>
                      Vá até o site do imóvel, copie as linhas da tabela de tipologias e cole no campo abaixo.
                    </DialogDescription>
                    <Textarea
                      placeholder="Exemplo:&#10;R$ 1.561.859 70,5 2 1 1&#10;R$ 1.687.232 76,5 2 2 1"
                      value={textToParse}
                      onChange={(e) => setTextToParse(e.target.value)}
                      className="h-32 font-mono text-sm"
                    />
                    <DialogFooter>
                      <Button onClick={handleParseFromText} disabled={isParsingText}>
                        {isParsingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isParsingText ? "Analisando..." : "Analisar Texto"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={addTypology} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {typologies.map((typology, index) => (
                <Card key={typology.id} className="p-4">
                  <div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => removeTypology(typology.id!)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Nome</Label><Input value={typology.nome ?? ''} onChange={(e) => updateTypology(typology.id!, "nome", e.target.value)} /></div>
                    <div><Label>Valor (R$)</Label><Input type="number" value={typology.valor ?? 0} onChange={(e) => updateTypology(typology.id!, "valor", parseFloat(e.target.value) || 0)} /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div><Label>Dorms</Label><Input type="number" value={typology.dormitorios ?? 0} onChange={(e) => updateTypology(typology.id!, 'dormitorios', parseInt(e.target.value, 10) || 0)} /></div>
                    <div><Label>Suítes</Label><Input type="number" value={typology.suites ?? 0} onChange={(e) => updateTypology(typology.id!, 'suites', parseInt(e.target.value, 10) || 0)} /></div>
                    <div><Label>Vagas</Label><Input type="number" value={typology.vagas ?? 0} onChange={(e) => updateTypology(typology.id!, 'vagas', parseInt(e.target.value, 10) || 0)} /></div>
                    <div><Label>Área (m²)</Label><Input type="number" value={typology.area ?? 0} onChange={(e) => updateTypology(typology.id!, 'area', parseFloat(e.target.value) || 0)} /></div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor={`planta-${index}`}>Planta da Tipologia</Label>
                    <Input id={`planta-${index}`} type="file" accept="image/*" onChange={(e) => handlePlantaImageChange(index, e)} />
                    <div className="flex gap-2 mt-2">
                      {typology.plantaPreview && (<img src={typology.plantaPreview} alt={`Nova planta para ${typology.nome}`} className="h-24 w-auto rounded-md border" />)}
                      {typology.plantas?.map((planta, pIndex) => (<div key={pIndex} className="relative"><img src={planta.url} alt={`Planta ${pIndex + 1} para ${typology.nome}`} className="h-24 w-auto rounded-md border" /></div>))}
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent><Select value={status} onValueChange={(value: StatusImovel) => setStatus(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={StatusImovel.Disponivel}>Disponível</SelectItem><SelectItem value={StatusImovel.Reservado}>Reservado</SelectItem><SelectItem value={StatusImovel.Vendido}>Vendido</SelectItem></SelectContent></Select></CardContent>
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
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!parsedTypologies} onOpenChange={() => { setParsedTypologies(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Tipologias Importadas</DialogTitle>
            <DialogDescription>
              Encontrámos os seguintes dados. Deseja substituir as tipologias atuais?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto pr-4 space-y-3">{parsedTypologies?.typologies?.map((t: any, index: number) => {
              if (!t || !t.nome) return null;
              return (
                <div key={index} className="text-sm p-3 border rounded-lg bg-muted/50">
                  <p className="font-semibold text-primary">{t.nome}</p>
                  <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                    <span><strong>Área:</strong> {t.area || 'N/A'} m²</span>
                    <span><strong>Dorms:</strong> {t.dormitorios || 'N/A'}</span>
                    <span><strong>Suítes:</strong> {t.suites || 'N/A'}</span>
                    <span><strong>Vagas:</strong> {t.vagas || 'N/A'}</span>
                  </div>
                  <p className="text-sm font-medium text-primary mt-2 pt-2 border-t">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(t.valor) || 0)}
                  </p>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setParsedTypologies(null); }}>Cancelar</Button>
            <Button onClick={handleConfirmTypologyUpdate}>Sim, Preencher Formulário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}