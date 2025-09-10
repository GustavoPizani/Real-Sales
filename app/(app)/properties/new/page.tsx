// app/(app)/properties/new/page.tsx

"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Save, Plus, Trash2, Upload, X, Loader2, ClipboardPaste } from "lucide-react";
import { type TipologiaImovel, StatusImovel, type ImagemPlanta } from "@prisma/client";

type TypologyWithFiles = Partial<TipologiaImovel> & {
  plantaFile?: File;
  plantaPreview?: string;
};

// Componente principal
export default function NewPropertyPage() {
    return <NewPropertyForm />;
}

// Componente do formulário
function NewPropertyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Estados do formulário
    const [title, setTitle] = useState("");
    const [type, setType] = useState("Apartamento");
    const [address, setAddress] = useState("");
    const [status, setStatus] = useState<StatusImovel>("LANCAMENTO");
    const [typologies, setTypologies] = useState<TypologyWithFiles[]>([]);
    const [features, setFeatures] = useState<string[]>([]);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    // Estados de controle
    const [saving, setSaving] = useState(false);

    // ✅ --- Estados para a nova função de importar texto ---
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<any | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [textToParse, setTextToParse] = useState("");
    // ----------------------------------------------------

    // Efeito para preencher o formulário com dados do URL (se houver)
    useEffect(() => {
        setTitle(searchParams.get("title") || "");
        setAddress(searchParams.get("address") || "");
    }, [searchParams]);

    // ✅ --- Nova função para chamar a API de análise de texto ---
    const handleParsePropertyFromText = async () => {
        if (!textToParse.trim()) {
            toast({ variant: "destructive", title: "Erro", description: "Por favor, cole algum texto." });
            return;
        }
        setIsParsing(true);
        try {
            const response = await fetch('/api/parse-new-property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToParse }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || "Não foi possível analisar os dados.");
            }
            const data = await response.json();

            setParsedData(data); // Salva todos os dados para confirmação
            setIsImportModalOpen(false);
            setIsConfirmOpen(true); // Abre o modal de confirmação
            setTextToParse("");

        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro na Análise", description: error.message });
        } finally {
            setIsParsing(false);
        }
    };

    // ✅ --- Função ATUALIZADA para preencher o formulário inteiro ---
    const handleFillForm = () => {
        if (!parsedData) return;

        setTitle(parsedData.title || "");
        setAddress(parsedData.address || "");
        setFeatures(parsedData.features || []);
        
        if (parsedData.typologies && Array.isArray(parsedData.typologies)) {
            const newTypologies = parsedData.typologies.map((t: any) => ({
                nome: t.nome || '',
                valor: parseFloat(t.valor) || 0,
                area: parseFloat(t.area) || 0,
                dormitorios: parseInt(t.dormitorios, 10) || 0,
                suites: parseInt(t.suites, 10) || 0,
                vagas: parseInt(t.vagas, 10) || 0,
            }));
            setTypologies(newTypologies);
        }

        setIsConfirmOpen(false);
        setParsedData(null);
        toast({ title: "Sucesso!", description: "Formulário preenchido com os dados importados." });
    };

    const handleSave = async () => {
        // ... (Sua função de salvar existente) ...
    };

    const handleTypologyChange = (index: number, field: keyof TipologiaImovel, value: string | number) => {
        const newTypologies = [...typologies];
        (newTypologies[index] as any)[field] = value;
        setTypologies(newTypologies);
    };

    const addTypology = () => {
        setTypologies(prev => [...prev, {}]);
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

    const handlePlantaImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newTypologies = [...typologies] as TypologyWithFiles[];
            newTypologies[index].plantaFile = file;
            newTypologies[index].plantaPreview = URL.createObjectURL(file);
            setTypologies(newTypologies);
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
                    <Link href="/properties" passHref legacyBehavior>
                        <a>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </a>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Novo Imóvel</h1>
                        <p className="text-muted-foreground">Preencha os dados para cadastrar um novo empreendimento.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* ✅ --- Botão ATUALIZADO para Importar de Texto --- ✅ */}
                    <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <ClipboardPaste className="mr-2 h-4 w-4" />
                                Importar de Texto
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Importar Imóvel de Texto</DialogTitle>
                                <DialogDescription>Copie todo o bloco de informações do imóvel e cole abaixo.</DialogDescription>
                            </DialogHeader>
                            <Textarea
                                value={textToParse}
                                onChange={(e) => setTextToParse(e.target.value)}
                                className="h-48 font-mono text-sm"
                                placeholder="Cole o texto do imóvel aqui..."
                            />
                            <DialogFooter>
                                <Button onClick={handleParsePropertyFromText} disabled={isParsing}>
                                    {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isParsing ? "Analisando..." : "Analisar e Importar"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "A guardar..." : "Guardar Imóvel"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label htmlFor="title">Título do Empreendimento</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label htmlFor="type">Tipo</Label><Input id="type" value={type} onChange={(e) => setType(e.target.value)} /></div>
                                <div><Label htmlFor="address">Endereço</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                            </div>
                            
                            <div>
                                <Label htmlFor="features">Características Condominiais (separadas por vírgula)</Label>
                                <Textarea 
                                    id="features" 
                                    value={features.join(', ')} 
                                    onChange={(e) => setFeatures(e.target.value.split(',').map(item => item.trim()))} 
                                    placeholder="Brinquedoteca, Churrasqueira, Elevador social..."
                                />
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tipologias</CardTitle>
                            <Button onClick={addTypology} size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {typologies.map((typology, index) => (
                                <div key={index} className="p-4 border rounded-md space-y-4 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTypology(index)}><Trash2 className="h-4 w-4" /></Button>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><Label>Nome</Label><Input value={typology.nome || ''} onChange={(e) => handleTypologyChange(index, 'nome', e.target.value)} /></div>
                                        <div><Label>Valor</Label><Input type="number" value={typology.valor || ''} onChange={(e) => handleTypologyChange(index, 'valor', parseFloat(e.target.value))} /></div>
                                        <div><Label>Área (m²)</Label><Input type="number" value={typology.area || ''} onChange={(e) => handleTypologyChange(index, 'area', parseFloat(e.target.value))} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><Label>Dorms</Label><Input type="number" value={typology.dormitorios || ''} onChange={(e) => handleTypologyChange(index, 'dormitorios', parseInt(e.target.value))} /></div>
                                        <div><Label>Suítes</Label><Input type="number" value={typology.suites || ''} onChange={(e) => handleTypologyChange(index, 'suites', parseInt(e.target.value))} /></div>
                                        <div><Label>Vagas</Label><Input type="number" value={typology.vagas || ''} onChange={(e) => handleTypologyChange(index, 'vagas', parseInt(e.target.value))} /></div>
                                    </div>
                                    <div className="mt-1">
                                        <Label htmlFor={`planta-${index}`}>Planta da Tipologia (Opcional)</Label>
                                        <Input id={`planta-${index}`} type="file" accept="image/*" onChange={(e) => handlePlantaImageChange(index, e)} className="mt-1" />
                                        {typology.plantaPreview && (
                                            <div className="mt-2"><img src={typology.plantaPreview} alt={`Planta para ${typology.nome}`} className="h-24 w-auto rounded-md border" /></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

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
            
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Confirmar Dados Importados</DialogTitle>
                        <DialogDescription>Verifique os dados extraídos antes de preencher o formulário.</DialogDescription>
                    </DialogHeader>
                    {parsedData && (
                        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {/* Título e Endereço */}
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Título</h3>
                                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{parsedData.title || "Não encontrado"}</p>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Endereço</h3>
                                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{parsedData.address || "Não encontrado"}</p>
                            </div>
                            
                            {/* ✅ --- EXIBIÇÃO DAS FEATURES NO MODAL DE CONFIRMAÇÃO --- ✅ */}
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm">Características Encontradas ({parsedData.features?.length || 0})</h3>
                                <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                                    {parsedData.features?.map((feature: string, index: number) => (
                                        <span key={index} className="text-xs bg-background border rounded-full px-2 py-0.5">{feature}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Tipologias */}
                            <div>
                                <h3 className="font-semibold text-sm mb-2">Tipologias Encontradas ({parsedData.typologies?.length || 0})</h3>
                                <div className="space-y-2">
                                    {parsedData.typologies?.map((t: any, index: number) => (
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
                        <Button onClick={handleFillForm}>Preencher Formulário</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
