// app/(app)/properties/new/page.tsx
"use client";
import { useState, useEffect, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Plus, Trash2, Upload, X, Loader2, Link as LinkIcon } from "lucide-react";
import { type TipologiaImovel, StatusImovel } from "@prisma/client";

// Componente principal que contém a lógica do formulário
export default function NewPropertyPage() {
    return <NewPropertyForm />;
}

// Componente do formulário extraído para manter a lógica organizada
function NewPropertyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Estados do formulário
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("");
    const [address, setAddress] = useState("");
    const [status, setStatus] = useState<StatusImovel>(StatusImovel.LANCAMENTO);
    const [typologies, setTypologies] = useState<Partial<TipologiaImovel>[]>([{ nome: "", valor: 0, area: 0, dormitorios: 0, suites: 0, vagas: 0 }]);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    // Estados de controle
    const [saving, setSaving] = useState(false);
    const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [scrapedData, setScrapedData] = useState<any | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Efeito para preencher o formulário com dados do URL
    useEffect(() => {
        setTitle(searchParams.get("title") || "");
        setAddress(searchParams.get("address") || "");
    }, [searchParams]);

    const handleImportFromUrl = async () => {
        if (!importUrl) {
            toast({ variant: "destructive", title: "Erro", description: "Por favor, insira um URL." });
            return;
        }
        setIsImporting(true);
        try {
            const response = await fetch('/api/scrape-property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: importUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Não foi possível extrair os dados do link.");
            }

            const data = await response.json();

            // Guarda os dados e abre o modal de confirmação
            setScrapedData(data);
            setIsImportUrlOpen(false);
            setIsConfirmOpen(true);
            setImportUrl("");

        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro na Importação", description: error.message });
        } finally {
            setIsImporting(false);
        }
    };

    const handleFillForm = () => {
        if (!scrapedData) return;

        // Preenche o formulário com os dados extraídos
        setTitle(scrapedData.title || "");
        setAddress(scrapedData.address || "");
        setDescription(scrapedData.description || "");
        if (scrapedData.typologies && Array.isArray(scrapedData.typologies)) {
            setTypologies(scrapedData.typologies);
        }

        // Fecha o modal de confirmação e limpa os dados
        setIsConfirmOpen(false);
        setScrapedData(null);
        toast({ title: "Sucesso!", description: "Formulário preenchido com os dados importados." });
    };

    const handleSave = async () => {
        if (!title) {
            toast({ variant: "destructive", title: "Erro", description: "O título é obrigatório." });
            return;
        }
        setSaving(true);

        try {
            // Passo 1: Fazer upload das imagens para obter os URLs
            const uploadedImageUrls: string[] = [];
            for (const image of images) {
                const formData = new FormData();
                formData.append("file", image);
                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                if (!uploadResponse.ok) {
                    throw new Error("Falha no upload da imagem.");
                }
                const { url } = await uploadResponse.json();
                uploadedImageUrls.push(url);
            }

            // Passo 2: Enviar os dados do imóvel, incluindo os URLs das imagens
            const propertyData = {
                title,
                description,
                type,
                address,
                status,
                typologies,
                imageUrls: uploadedImageUrls,
            };

            const token = localStorage.getItem('authToken');
            const response = await fetch("/api/properties", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(propertyData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao salvar imóvel");
            }
            
            toast({ title: "Sucesso!", description: "Imóvel cadastrado com sucesso." });
            router.push("/properties");

        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleTypologyChange = (index: number, field: keyof TipologiaImovel, value: string | number) => {
        const newTypologies = [...typologies];
        (newTypologies[index] as any)[field] = value;
        setTypologies(newTypologies);
    };

    const addTypology = () => {
        setTypologies([...typologies, { nome: "", valor: 0, area: 0, dormitorios: 0, suites: 0, vagas: 0 }]);
    };

    const removeTypology = (index: number) => {
        setTypologies(typologies.filter((_, i) => i !== index));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImages(prev => [...prev, ...filesArray]);

            const previewsArray = filesArray.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...previewsArray]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
        setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/properties">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Novo Imóvel</h1>
                        <p className="text-muted-foreground">Preencha os dados para cadastrar um novo empreendimento.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isImportUrlOpen} onOpenChange={setIsImportUrlOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Importar de um Link
                            </Button>
                        </DialogTrigger>
                        {/* O conteúdo do Dialog será renderizado no final do componente */}
                    </Dialog>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {saving ? "A guardar..." : "Guardar Imóvel"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna da Esquerda */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label htmlFor="title">Título do Empreendimento</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                            <div><Label htmlFor="description">Descrição</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label htmlFor="type">Tipo</Label><Input id="type" value={type} onChange={(e) => setType(e.target.value)} /></div>
                                <div><Label htmlFor="address">Endereço</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select onValueChange={(value: StatusImovel) => setStatus(value)} defaultValue={status}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.values(StatusImovel).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Tipologias</CardTitle><Button onClick={addTypology} size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar</Button></CardHeader>
                        <CardContent className="space-y-4">
                            {typologies.map((typology, index) => (
                                <div key={index} className="p-4 border rounded-md space-y-2 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTypology(index)}><Trash2 className="h-4 w-4" /></Button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><Label>Nome</Label><Input value={typology.nome || ''} onChange={(e) => handleTypologyChange(index, 'nome', e.target.value)} /></div>
                                        <div><Label>Valor</Label><Input type="number" value={typology.valor || ''} onChange={(e) => handleTypologyChange(index, 'valor', parseFloat(e.target.value))} /></div>
                                        <div><Label>Área (m²)</Label><Input type="number" value={typology.area || ''} onChange={(e) => handleTypologyChange(index, 'area', parseInt(e.target.value))} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><Label>Dorms</Label><Input type="number" value={typology.dormitorios || ''} onChange={(e) => handleTypologyChange(index, 'dormitorios', parseInt(e.target.value))} /></div>
                                        <div><Label>Suítes</Label><Input type="number" value={typology.suites || ''} onChange={(e) => handleTypologyChange(index, 'suites', parseInt(e.target.value))} /></div>
                                        <div><Label>Vagas</Label><Input type="number" value={typology.vagas || ''} onChange={(e) => handleTypologyChange(index, 'vagas', parseInt(e.target.value))} /></div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna da Direita */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Imagens</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Label htmlFor="images-upload" className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                                    <div className="text-center"><Upload className="mx-auto h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Clique ou arraste para enviar</p></div>
                                </Label>
                                <Input id="images-upload" type="file" multiple className="hidden" onChange={handleImageChange} />
                                <div className="grid grid-cols-3 gap-2">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative group">
                                            <img src={preview} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded-md" />
                                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de Confirmação de Dados Importados */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Confirmar Dados Importados</DialogTitle>
                        <DialogDescription>
                            Verifique os dados extraídos do link antes de preencher o formulário.
                        </DialogDescription>
                    </DialogHeader>
                    {scrapedData && (
                        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Título</h3>
                                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{scrapedData.title || "Não encontrado"}</p>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Endereço</h3>
                                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{scrapedData.address || "Não encontrado"}</p>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Descrição</h3>
                                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md line-clamp-4">{scrapedData.description || "Não encontrada"}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm mb-2">Tipologias Encontradas ({scrapedData.typologies?.length || 0})</h3>
                                <div className="space-y-2">
                                    {scrapedData.typologies?.map((t: any, index: number) => (
                                        <div key={index} className="text-xs text-muted-foreground p-2 border rounded-md">
                                            <p className="font-bold text-foreground">{t.nome}</p>
                                            <p>Área: {t.area || 'N/A'} m² | Dorms: {t.dormitorios || 'N/A'} | Suítes: {t.suites || 'N/A'} | Vagas: {t.vagas || 'N/A'}</p>
                                            <p>Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor || 0)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
                        <Button onClick={handleFillForm}>
                            Preencher Formulário
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Importação */}
            <Dialog open={isImportUrlOpen} onOpenChange={setIsImportUrlOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Imóvel de um Link</DialogTitle>
                  <DialogDescription>Cole o link do portal (ex: Orulo) para importar os dados automaticamente.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                  <Label htmlFor="import-url">URL do Imóvel</Label>
                  <Input 
                    id="import-url" 
                    placeholder="https://www.orulo.com.br/..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportUrlOpen(false)}>Cancelar</Button>
                  <Button onClick={handleImportFromUrl} disabled={isImporting}>
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isImporting ? "Importando..." : "Importar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
