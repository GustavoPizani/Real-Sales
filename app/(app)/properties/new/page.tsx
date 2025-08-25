// app/(app)/properties/new/page.tsx

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import { type TipologiaImovel, StatusImovel } from "@prisma/client";

// Componente principal que contém a lógica do formulário
function NewPropertyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Estados do formulário principal
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("Empreendimento");
    const [address, setAddress] = useState("");
    const [status, setStatus] = useState<StatusImovel>(StatusImovel.Disponivel);
    const [images, setImages] = useState<File[]>([]);
    
    // Estado para as tipologias
    const [typologies, setTypologies] = useState<Partial<TipologiaImovel>[]>([]);

    // Estados de controle
    const [saving, setSaving] = useState(false);

    // Efeito para preencher o formulário com dados do URL
    useEffect(() => {
        setTitle(searchParams.get("title") || "");
        setAddress(searchParams.get("address") || "");
    }, [searchParams]);

    const handleSave = async () => {
        if (!title) {
            toast({ variant: "destructive", title: "Erro", description: "O nome do projeto é obrigatório." });
            return;
        }
        setSaving(true);

        try {
            // Passo 1: Fazer o upload das imagens para a API /api/upload
            const uploadedImageUrls = [];
            for (const imageFile of images) {
                const formData = new FormData();
                formData.append('file', imageFile);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Falha ao fazer upload da imagem: ${imageFile.name}`);
                }
                const result = await response.json();
                uploadedImageUrls.push(result.url);
            }

            // Passo 2: Enviar os dados do imóvel, incluindo os URLs das imagens
            const propertyData = {
                title,
                description,
                type,
                address,
                status,
                typologies,
                imageUrls: uploadedImageUrls, // Envia os URLs obtidos
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
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } finally {
            setSaving(false);
        }
    };
    
    // Funções para gerir tipologias
    const addTypology = () => {
        setTypologies(prev => [...prev, { id: `temp-${Date.now()}`, nome: '', valor: 0, dormitorios: 0, suites: 0, vagas: 0, area: 0 }]);
    };

    const removeTypology = (id: string) => {
        setTypologies(prev => prev.filter(t => t.id !== id));
    };

    const updateTypology = (id: string, field: keyof TipologiaImovel, value: any) => {
        setTypologies(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const filesArray = Array.from(selectedFiles);
            setImages(prev => [...prev, ...filesArray]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/properties')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Novo Imóvel</h1>
                        <p className="text-muted-foreground">Preencha os dados para cadastrar um novo empreendimento.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saving ? "A guardar..." : "Guardar Imóvel"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Informações Básicas */}
                    <Card>
                        <CardHeader><CardTitle>Informações do Projeto</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="title">Nome do Projeto *</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Residencial Vista Alegre" />
                            </div>
                            <div>
                                <Label htmlFor="address">Endereço</Label>
                                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade..." />
                            </div>
                            <div>
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva os diferenciais do empreendimento..." />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tipologias */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tipologias</CardTitle>
                            <Button size="sm" variant="outline" onClick={addTypology}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {typologies.map((typology) => (
                                <div key={typology.id} className="border p-4 rounded-lg space-y-4 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTypology(typology.id!)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><Label>Nome da Tipologia</Label><Input value={typology.nome} onChange={e => updateTypology(typology.id!, 'nome', e.target.value)} placeholder="Ex: Apto 2 Suítes" /></div>
                                        <div><Label>Valor (R$)</Label><Input type="number" value={typology.valor || ''} onChange={e => updateTypology(typology.id!, 'valor', parseFloat(e.target.value))} placeholder="500000" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div><Label>Dorms</Label><Input type="number" value={typology.dormitorios || ''} onChange={e => updateTypology(typology.id!, 'dormitorios', parseInt(e.target.value))} placeholder="2" /></div>
                                        <div><Label>Suítes</Label><Input type="number" value={typology.suites || ''} onChange={e => updateTypology(typology.id!, 'suites', parseInt(e.target.value))} placeholder="1" /></div>
                                        <div><Label>Vagas</Label><Input type="number" value={typology.vagas || ''} onChange={e => updateTypology(typology.id!, 'vagas', parseInt(e.target.value))} placeholder="1" /></div>
                                        <div><Label>Área (m²)</Label><Input type="number" value={typology.area || ''} onChange={e => updateTypology(typology.id!, 'area', parseFloat(e.target.value))} placeholder="65" /></div>
                                    </div>
                                </div>
                            ))}
                            {typologies.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhuma tipologia adicionada.</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Lateral */}
                <div className="space-y-6">
                    {/* Status */}
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
                    
                    {/* Imagens */}
                    <Card>
                        <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Label htmlFor="image-upload" className="w-full inline-block cursor-pointer text-center p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
                                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                <span className="mt-2 block text-sm font-medium text-gray-600">Subir fotos</span>
                            </Label>
                            <Input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <div className="grid grid-cols-2 gap-2">
                                {images.map((file, index) => (
                                    <div key={index} className="relative group">
                                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover rounded-md" />
                                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                     {/* Contato de Parceria */}
                     <Card>
                        <CardHeader><CardTitle>Contato de Parceria</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             {/* Adicione os campos de contato de parceria aqui */}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// A página exportada usa Suspense para permitir o uso do useSearchParams
export default function NewPropertyPage() {
    return (
        <Suspense fallback={<div>A carregar...</div>}>
            <NewPropertyForm />
        </Suspense>
    );
}
