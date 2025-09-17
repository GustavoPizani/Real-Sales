"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    startOfWeek, endOfWeek, format, subWeeks, addWeeks,
    startOfMonth, endOfMonth, subMonths, addMonths, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, RotateCcw, Shuffle, MapPin, Calendar as CalendarIcon, XCircle, Settings, List, Loader2, AlertTriangle } from "lucide-react"
import type { User as BaseUser } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { GoogleMapsPicker } from "@/components/google-maps-picker";

// --- Interfaces ---
interface User extends BaseUser {
    leadCount?: number;
}

interface Funnel {
    id: string;
    name: string;
    isPreSales?: boolean;
}

interface Roleta {
    id: string
    nome: string
    ativa: boolean
    last_assigned_index: number
    validFrom?: string | null;
    validUntil?: string | null;
    usuarios: User[]
    created_at: string;
    funnel?: Funnel;
    funnelId?: string | null;
}

interface FrequenciaConfig {
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
    raio: number;
    horarios: Array<{ inicio: string; fim: string }>;
    diasDaSemana: number[]; // 0 = Domingo, 1 = Segunda, etc.
    ativo: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FrequenciaRegistro {
    id: string;
    userId: string;
    usuario: {
        id: string;
        nome: string;
        email: string;
        role: string;
    };
    latitude: number;
    longitude: number;
    distancia: number;
    dentroDoRaio: boolean;
    config?: { // ✅ Adicionado para receber o nome do local
        nome: string;
    } | null;
    createdAt: string;
}

// --- Funções Auxiliares ---
const safeFormatDate = (dateString: string | null | undefined, formatString: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), formatString);
    } catch (error) {
        return 'Data inválida';
    }
};

const safeFormatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch (error) {
        return 'Data inválida';
    }
}

const groupRegistrosByWeek = (registros: FrequenciaRegistro[]) => {
    const grouped: { [key: string]: FrequenciaRegistro[] } = {};
    registros.forEach(registro => {
        const weekStart = startOfWeek(parseISO(registro.createdAt), { locale: ptBR });
        const weekKey = format(weekStart, "dd/MM/yyyy", { locale: ptBR });
        if (!grouped[weekKey]) {
            grouped[weekKey] = [];
        }
        grouped[weekKey].push(registro);
    });
    return grouped;
};

// --- Hooks Personalizados para Frequência ---
const useFrequenciaData = (user, selectedReportUserId, reportDateRange) => {
    const { toast } = useToast();
    const [configs, setConfigs] = useState<FrequenciaConfig[]>([]);
    const [registros, setRegistros] = useState<FrequenciaRegistro[]>([]);
    const [reportUsers, setReportUsers] = useState<BaseUser[]>([]);
    const [loading, setLoading] = useState({ configs: true, registros: true, users: true });

    const fetcher = useCallback(async (url: string) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Falha na requisição para ${url}`);
        }
        return response.json();
    }, []);

    const fetchAllData = useCallback(() => {
        if (!user) return;
        
        const isAdminOrDirector = ['marketing_adm', 'diretor'].includes(user.role);

        if (user.role === 'marketing_adm') {
            setLoading(prev => ({ ...prev, configs: true }));
            fetcher('/api/frequencia/config')
                .then(data => setConfigs(data))
                .catch(err => toast({ variant: 'destructive', title: 'Erro (Configurações)', description: err.message }))
                .finally(() => setLoading(prev => ({ ...prev, configs: false })));
        } else {
            // ✅ CORREÇÃO: Para outros usuários, não tentamos buscar as configurações,
            // evitando o erro 401. Apenas marcamos como 'não carregando'.
            setLoading(prev => ({ ...prev, configs: false }));
        }

        setLoading(prev => ({ ...prev, registros: true }));
        const params = new URLSearchParams();
        if (isAdminOrDirector) {
            if (selectedReportUserId !== 'all') params.append('userId', selectedReportUserId);
            if (reportDateRange?.from) params.append('startDate', format(reportDateRange.from, 'yyyy-MM-dd'));
            if (reportDateRange?.to) params.append('endDate', format(reportDateRange.to, 'yyyy-MM-dd'));
        }
        fetcher(`/api/frequencia/registros?${params.toString()}`)
            .then(data => setRegistros(data))
            .catch(err => toast({ variant: 'destructive', title: 'Erro (Registros)', description: err.message }))
            .finally(() => setLoading(prev => ({ ...prev, registros: false })));

        if (isAdminOrDirector) {
            setLoading(prev => ({ ...prev, users: true }));
            fetcher('/api/users')
                .then(data => setReportUsers(data.users || []))
                .catch(err => toast({ variant: 'destructive', title: 'Erro (Usuários)', description: err.message }))
                .finally(() => setLoading(prev => ({ ...prev, users: false })));
        } else {
            setLoading(prev => ({ ...prev, users: false }));
        }
    }, [user, fetcher, toast, selectedReportUserId, reportDateRange]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return { configs, registros, reportUsers, loading, refetch: fetchAllData };
};

// --- Componentes de Visualização para Frequência ---
function FrequenciaAdminView({ configs, loading, onEdit, onDelete }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Configurações de Frequência</CardTitle>
                <Button onClick={() => onEdit(null)}><Plus className="h-4 w-4 mr-2" /> Nova Configuração</Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : configs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma configuração criada.</p>
                ) : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Raio (m)</TableHead><TableHead>Horários</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {configs.map(config => (
                                <TableRow key={config.id}>
                                    <TableCell className="font-medium">{config.nome}</TableCell>
                                    <TableCell>{config.raio}</TableCell>
                                    <TableCell>{config.horarios.map((h, i) => <Badge key={i} variant="secondary" className="mr-1 mb-1">{h.inicio}-{h.fim}</Badge>)}</TableCell>
                                    <TableCell><Badge variant={config.ativo ? 'default' : 'destructive'}>{config.ativo ? 'Sim' : 'Não'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(config)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(config.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function FrequenciaReportView({ user, registros, reportUsers, loading, dateRange, onDateRangeChange, selectedUserId, onSelectedUserIdChange, onDatePresetChange }) {
    const groupedRegistros = useMemo(() => groupRegistrosByWeek(registros), [registros]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Frequência</CardTitle>
                <CardDescription>Visualize os registros de frequência da equipe.</CardDescription>
            </CardHeader>
            <CardContent>
                {(user?.role === 'marketing_adm' || user?.role === 'diretor') && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Select value={selectedUserId} onValueChange={onSelectedUserIdChange}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os Usuários" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Usuários</SelectItem>
                                {reportUsers
                                    .filter(u => u.role === 'corretor' || u.role === 'gerente')
                                    .map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? `${format(dateRange.from, "dd/MM/yy")} - ${dateRange.to ? format(dateRange.to, "dd/MM/yy") : ''}` : "Selecione um período"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 flex" align="start">
                                <div className="flex flex-col space-y-1 p-2 border-r min-w-[120px]">
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => onDatePresetChange('currentWeek')}>Esta semana</Button>
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => onDatePresetChange('lastWeek')}>Semana passada</Button>
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => onDatePresetChange('currentMonth')}>Este mês</Button>
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => onDatePresetChange('lastMonth')}>Mês passado</Button>
                                </div>
                                <Calendar mode="range" selected={dateRange} onSelect={onDateRangeChange} locale={ptBR} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : Object.keys(groupedRegistros).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum registro de frequência encontrado.</p>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedRegistros).map(([weekKey, weekRegistros]) => (
                            <div key={weekKey}>
                                <h3 className="text-lg font-semibold mb-3">Semana de {weekKey}</h3>
                                <Table>
                                    <TableHeader><TableRow>{(user?.role === 'marketing_adm' || user?.role === 'diretor') && <TableHead>Usuário</TableHead>}<TableHead>Data/Hora</TableHead><TableHead>Distância</TableHead><TableHead>Local</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {weekRegistros.map(registro => (
                                            <TableRow key={registro.id}>
                                                {(user?.role === 'marketing_adm' || user?.role === 'diretor') && <TableCell>{registro.usuario.nome}</TableCell>}
                                                <TableCell>{format(parseISO(registro.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                                                <TableCell>{registro.distancia}m</TableCell>
                                                <TableCell>{registro.config?.nome || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FrequenciaUserView({ configs, registros, loading, onRegister, isRegistering, geolocationError }) {
    const [isCheckinAvailable, setIsCheckinAvailable] = useState(false);
    const [nextCheckinTime, setNextCheckinTime] = useState<string | null>(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(true);
    const [selectedRegistro, setSelectedRegistro] = useState<FrequenciaRegistro | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);

    useEffect(() => {
        const checkAvailability = async () => {
            setAvailabilityLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('/api/frequencia/check-availability', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setIsCheckinAvailable(data.available);
            } catch (error) {
                console.error("Erro ao verificar disponibilidade de check-in:", error);
                setIsCheckinAvailable(false);
            } finally {
                setAvailabilityLoading(false);
            }
        };

        checkAvailability();
        const interval = setInterval(checkAvailability, 60000); // Verifica a cada minuto
        return () => clearInterval(interval);
    }, []);

    const handleRowClick = async (registro: FrequenciaRegistro) => {
        setSelectedRegistro({ ...registro, address: 'A carregar endereço...' });
        setIsDetailModalOpen(true);
        setLoadingAddress(true);
        try {
            const response = await fetch(`/api/geocode?lat=${registro.latitude}&lng=${registro.longitude}`);
            const data = await response.json();
            setSelectedRegistro(prev => prev ? { ...prev, address: data.address || 'Não foi possível obter o endereço.' } : null);
        } catch (error) {
            setSelectedRegistro(prev => prev ? { ...prev, address: 'Erro ao obter endereço.' } : null);
        } finally {
            setLoadingAddress(false);
        }
    };

    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedRegistro(null);
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Registrar Frequência</CardTitle>
                <CardDescription>Registre a sua presença.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={onRegister} disabled={isRegistering || availabilityLoading || !isCheckinAvailable} className="w-full">
                    {isRegistering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                    {availabilityLoading ? 'A verificar...' : isRegistering ? 'A registrar...' : 'Registrar Minha Frequência'}
                </Button>
                {!availabilityLoading && !isCheckinAvailable && (
                    <Alert variant="default" className="text-center">
                        <AlertDescription>
                            Você já registrou a presença neste horário ou está fora do período de check-in.
                        </AlertDescription>
                    </Alert>
                )}
                {geolocationError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{geolocationError}</AlertDescription>
                    </Alert>
                )}
                <Separator />
                <h3 className="text-lg font-semibold">Meus Registros Recentes</h3>
                {loading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : registros.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum registro de frequência encontrado.</p>
                ) : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Local</TableHead><TableHead>Horário</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {registros.map((registro) => (
                                <TableRow key={registro.id} onClick={() => handleRowClick(registro)} className="cursor-pointer">
                                    <TableCell className="font-medium">{registro.config?.nome || 'N/A'}</TableCell>
                                    <TableCell>{format(parseISO(registro.createdAt), 'HH:mm')}</TableCell>
                                    <TableCell>{format(parseISO(registro.createdAt), 'dd/MM/yy')}</TableCell>
                                    <TableCell><Badge variant={registro.dentroDoRaio ? 'default' : 'destructive'}>{registro.dentroDoRaio ? 'Dentro do Raio' : 'Fora do Raio'}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Modal de Detalhes do Registro */}
            <Dialog open={isDetailModalOpen} onOpenChange={closeDetailModal}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Registro</DialogTitle>
                        <DialogDescription>
                            Informações capturadas no momento do registro de frequência.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRegistro && (
                        <div className="space-y-4 pt-4">
                            <div className="h-64 w-full rounded-md overflow-hidden">
                                <GoogleMapsPicker
                                    latitude={selectedRegistro.latitude}
                                    longitude={selectedRegistro.longitude}
                                    radius={0}
                                    onLocationChange={() => {}}
                                />
                            </div>
                            <div className="space-y-2">
                                <p><strong className="font-semibold">Local:</strong> {selectedRegistro.config?.nome || 'Não especificado'}</p>
                                <p><strong className="font-semibold">Horário:</strong> {safeFormatDateTime(selectedRegistro.createdAt)}</p>
                                <p><strong className="font-semibold">Endereço Aproximado:</strong> {loadingAddress ? <Loader2 className="inline-block h-4 w-4 animate-spin" /> : selectedRegistro.address}</p>
                                <p><strong className="font-semibold">Dispositivo:</strong> <span className="text-xs text-muted-foreground">{navigator.userAgent}</span></p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={closeDetailModal}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// --- Componente Principal da Aba de Frequência ---
function FrequenciaTabContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<FrequenciaConfig | null>(null);
    const [configForm, setConfigForm] = useState({ nome: '', latitude: '', longitude: '', raio: '', horarios: [{ inicio: '', fim: '' }], ativo: true });
    const [diasDaSemana, setDiasDaSemana] = useState<number[]>([]);
    const [isConfigDeleteDialogOpen, setIsConfigDeleteDialogOpen] = useState(false);
    const [configToDelete, setConfigToDelete] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [geolocationError, setGeolocationError] = useState<string | null>(null);
    const [selectedReportUserId, setSelectedReportUserId] = useState<string>('all');
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>({ from: startOfWeek(new Date(), { locale: ptBR }), to: endOfWeek(new Date(), { locale: ptBR }) });
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isManualRegisterModalOpen, setIsManualRegisterModalOpen] = useState(false);

    const { configs, registros, reportUsers, loading, refetch } = useFrequenciaData(user, selectedReportUserId, reportDateRange);

    const handleHorarioChange = (index: number, field: 'inicio' | 'fim', value: string) => {
        const newHorarios = [...configForm.horarios];
        newHorarios[index] = { ...newHorarios[index], [field]: value };
        setConfigForm(prev => ({ ...prev, horarios: newHorarios }));
    };

    const handleDiaSemanaChange = (dia: number) => {
        setDiasDaSemana(prev =>
            prev.includes(dia)
                ? prev.filter(d => d !== dia)
                : [...prev, dia]
        );
    };

    const addHorario = () => setConfigForm(prev => ({ ...prev, horarios: [...prev.horarios, { inicio: '', fim: '' }] }));
    const removeHorario = (index: number) => setConfigForm(prev => ({ ...prev, horarios: prev.horarios.filter((_, i) => i !== index) }));

    const openConfigModal = (config: FrequenciaConfig | null = null) => {
        if (config) {
            setEditingConfig(config);
            setConfigForm({
                nome: config.nome, latitude: String(config.latitude), longitude: String(config.longitude),
                raio: String(config.raio), horarios: config.horarios || [{ inicio: '', fim: '' }], ativo: config.ativo,
            });
            setDiasDaSemana(config.diasDaSemana || []);
        } else {
            setEditingConfig(null);
            setConfigForm({ nome: '', latitude: '', longitude: '', raio: '', horarios: [{ inicio: '', fim: '' }], ativo: true });
            setDiasDaSemana([]);
        }
        setIsConfigModalOpen(true);
    };

    const handleConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...configForm,
            latitude: parseFloat(configForm.latitude),
            longitude: parseFloat(configForm.longitude),
            raio: parseInt(configForm.raio, 10),
            diasDaSemana: diasDaSemana,
        };
        try {
            const token = localStorage.getItem('authToken');
            const method = editingConfig ? 'PUT' : 'POST';
            const url = editingConfig ? `/api/frequencia/config/${editingConfig.id}` : '/api/frequencia/config';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar configuração.');
            }
            toast({ title: 'Sucesso!', description: 'Configuração salva.' });
            setIsConfigModalOpen(false);
            refetch();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const handleDeleteConfig = async () => {
        if (!configToDelete) return;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/frequencia/config/${configToDelete}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao apagar.');
            toast({ title: 'Sucesso!', description: 'Configuração apagada.' });
            setIsConfigDeleteDialogOpen(false);
            setConfigToDelete(null);
            refetch();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const registerPresence = () => {
        setGeolocationError(null);
        setIsRegistering(true);
        if (!navigator.geolocation) {
            setGeolocationError('Geolocalização não suportada.');
            setIsRegistering(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('/api/frequencia/registros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao registrar.');
                }
                const registro = await response.json();
                toast({ title: 'Sucesso!', description: `Presença registrada ${registro.dentroDoRaio ? 'dentro' : 'fora'} do raio.` });
                refetch();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Erro', description: error.message });
            } finally {
                setIsRegistering(false);
            }
        }, (error) => {
            setGeolocationError(`Erro de geolocalização: ${error.message}`);
            toast({ variant: 'destructive', title: 'Erro de Geolocalização', description: error.message });
            setIsRegistering(false);
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    };

    const handleManualRegister = async (selectedUserId: string, selectedConfigId: string, selectedHorario: string) => {
        const config = configs.find(c => c.id === selectedConfigId);
        if (!config) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Configuração não encontrada.' });
            return;
        }
        if (!selectedHorario) { toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, selecione um horário.' }); return; }

        setIsRegistering(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/frequencia/registros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    latitude: config.latitude,
                    longitude: config.longitude,
                    userId: selectedUserId,
                    horarioManual: selectedHorario,
                }),
            });
            if (!response.ok) throw new Error('Falha ao registrar manualmente.');
            toast({ title: 'Sucesso!', description: 'Presença manual registrada.' });
            refetch();
            setIsManualRegisterModalOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setIsRegistering(false);
        }
    };

    const handleReportDatePreset = (preset: 'currentWeek' | 'lastWeek' | 'currentMonth' | 'lastMonth') => {
        const today = new Date();
        let from: Date, to: Date;
        switch (preset) {
            case 'lastWeek': from = startOfWeek(subWeeks(today, 1), { locale: ptBR }); to = endOfWeek(subWeeks(today, 1), { locale: ptBR }); break;
            case 'currentMonth': from = startOfMonth(today); to = endOfMonth(today); break;
            case 'lastMonth': from = startOfMonth(subMonths(today, 1)); to = endOfMonth(subMonths(today, 1)); break;
            default: from = startOfWeek(today, { locale: ptBR }); to = endOfWeek(today, { locale: ptBR });
        }
        setReportDateRange({ from, to });
    };

    if (!user) return <div className="p-6"><Alert><AlertDescription>A carregar...</AlertDescription></Alert></div>;

    const reportViewProps = {
        user,
        registros,
        reportUsers,
        loading: loading.registros || loading.users,
        dateRange: reportDateRange,
        onDateRangeChange: setReportDateRange,
        selectedUserId: selectedReportUserId,
        onSelectedUserIdChange: setSelectedReportUserId,
        onDatePresetChange: handleReportDatePreset,
    };

    return (
        <>
            {user.role === 'marketing_adm' ? (
                <Tabs defaultValue="report" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="report"><List className="h-4 w-4 mr-2" /> Relatório</TabsTrigger>
                        <div className="relative">
                            <TabsTrigger value="config" className="w-full"><Settings className="h-4 w-4 mr-2" /> Configurações</TabsTrigger>
                            <Button size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-7" onClick={() => setIsManualRegisterModalOpen(true)}>Registro Manual</Button>
                        </div>
                    </TabsList>
                    <TabsContent value="report" className="mt-6"><FrequenciaReportView {...reportViewProps} /></TabsContent>
                    <TabsContent value="config" className="mt-6">
                        <FrequenciaAdminView
                            configs={configs}
                            loading={loading.configs}
                            onEdit={openConfigModal}
                            onDelete={(id) => { setConfigToDelete(id); setIsConfigDeleteDialogOpen(true); }}
                        />
                    </TabsContent>
                </Tabs>
            ) : user.role === 'diretor' ? (
                <FrequenciaReportView {...reportViewProps} />
            ) : (
                <FrequenciaUserView
                    configs={configs}
                    registros={registros}
                    loading={loading.registros}
                    onRegister={registerPresence}
                    isRegistering={isRegistering}
                    geolocationError={geolocationError}
                />
            )}

            <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingConfig ? 'Editar' : 'Nova'} Configuração</DialogTitle></DialogHeader>
                    <div className="pt-4">
                        <form onSubmit={handleConfigSubmit} className="space-y-4">
                        <div><Label htmlFor="nome">Nome do Local</Label><Input id="nome" name="nome" value={configForm.nome} onChange={(e) => setConfigForm(prev => ({ ...prev, nome: e.target.value }))} required /></div>
                        <div>
                            <Label>Localização</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Input value={configForm.latitude && configForm.longitude ? `${configForm.latitude}, ${configForm.longitude}` : "Nenhuma localização definida"} readOnly className="bg-muted" />
                                <Button type="button" variant="outline" onClick={() => setIsMapModalOpen(true)}>
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Selecionar
                                </Button>
                            </div>
                        </div>
                        <div><Label htmlFor="raio">Raio (metros)</Label><Input id="raio" name="raio" type="number" value={configForm.raio} onChange={(e) => setConfigForm(prev => ({ ...prev, raio: e.target.value }))} required /></div>
                        <div>
                            <Label>Horários de Ativação</Label>
                            {configForm.horarios.map((horario, index) => (
                                <div key={index} className="flex gap-2 mt-2">
                                    <Input type="time" value={horario.inicio} onChange={(e) => handleHorarioChange(index, 'inicio', e.target.value)} required />
                                    <Input type="time" value={horario.fim} onChange={(e) => handleHorarioChange(index, 'fim', e.target.value)} required />
                                    <Button type="button" variant="outline" size="icon" onClick={() => removeHorario(index)}><XCircle className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" className="mt-2 w-full" onClick={addHorario}><Plus className="h-4 w-4 mr-2" /> Adicionar Horário</Button>
                        </div>
                        <div>
                            <Label>Dias da Semana</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, index) => (
                                    <Button key={index} type="button" variant={diasDaSemana.includes(index) ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => handleDiaSemanaChange(index)}>
                                        {dia}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="ativo" name="ativo" checked={configForm.ativo} onCheckedChange={(checked) => setConfigForm(prev => ({ ...prev, ativo: checked }))} />
                            <Label htmlFor="ativo">Ativo</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsConfigModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal do Mapa */}
            <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Selecionar Localização</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Use a busca ou dê um duplo clique no mapa para definir o pino.
                        </p>
                    </DialogHeader>
                    <GoogleMapsPicker
                        latitude={parseFloat(configForm.latitude) || 0}
                        longitude={parseFloat(configForm.longitude) || 0}
                        radius={parseInt(configForm.raio, 10) || 0}
                        onLocationChange={({ lat, lng }) => {
                            setConfigForm(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
                        }}
                    />
                    <DialogFooter><Button onClick={() => setIsMapModalOpen(false)}>Concluir</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Registro Manual */}
            <Dialog open={isManualRegisterModalOpen} onOpenChange={setIsManualRegisterModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Registro de Frequência Manual</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const userId = formData.get('userId') as string;
                        const configId = formData.get('configId') as string;
                        const horario = formData.get('horario') as string;
                        handleManualRegister(userId, configId);
                        handleManualRegister(userId, configId, horario);
                    }} className="space-y-4 pt-4">
                        <div>
                            <Label htmlFor="userId">Usuário</Label>
                            <Select name="userId" required><SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                                <SelectContent>{reportUsers
                                    .filter(u => u.role === 'corretor' || u.role === 'gerente')
                                    .map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="configId">Local de Frequência</Label>
                            <Select name="configId" required onValueChange={(value) => {
                                const selected = configs.find(c => c.id === value);
                                setConfigForm(prev => ({ ...prev, horarios: selected?.horarios || [] }));
                            }}><SelectTrigger><SelectValue placeholder="Selecione um local" /></SelectTrigger>
                                <SelectContent>{configs.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {configForm.horarios.length > 1 && (
                            <div>
                                <Label htmlFor="horario">Horário do Registro</Label>
                                <Select name="horario" required><SelectTrigger><SelectValue placeholder="Selecione um horário" /></SelectTrigger>
                                    <SelectContent>{configForm.horarios.map((h, i) => <SelectItem key={i} value={h.inicio}>{`${h.inicio} - ${h.fim}`}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsManualRegisterModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isRegistering}>{isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfigDeleteDialogOpen} onOpenChange={setIsConfigDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfigToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfig}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// --- Componente Principal da Página ---
export default function RoletaPage() {
    const { user } = useAuth()
    const [isClient, setIsClient] = useState(false);
    const [roletas, setRoletas] = useState<Roleta[]>([])
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [funnels, setFunnels] = useState<Funnel[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingRoleta, setEditingRoleta] = useState<Roleta | null>(null)
    const [roletaToDelete, setRoletaToDelete] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        nome: "",
        usuarios: [] as string[],
        validFrom: '',
        validUntil: '',
        funnelId: '',
    })
    const [participantOrder, setParticipantOrder] = useState<User[]>([]);
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setIsClient(true);
        if (user) {
            loadRoletas()
            loadAllUsers()
            loadFunnels()
        }
    }, [user])

    const loadRoletas = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/roletas?_=${new Date().getTime()}`, {
                headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                setRoletas(Array.isArray(data) ? data : (data?.roletas || []));
            } else {
                setRoletas([]);
            }
        } catch (error) {
            console.error("Erro ao carregar roletas:", error)
        } finally {
            setLoading(false)
        }
    }

    const loadAllUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/users?_=${new Date().getTime()}`, {
                headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json()
                setAllUsers(data.users || [])
            }
        } catch (error) {
            console.error("Erro ao carregar usuários:", error)
        }
    }

    const loadFunnels = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/funnels', {
                headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json();
                setFunnels(data.funnels || []);
            }
        } catch (error) {
            console.error("Erro ao carregar funis:", error);
        }
    };

    const handleCreateRoleta = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.usuarios.length === 0) {
            setMessage("Selecione pelo menos um corretor ou gerente para a roleta.")
            setTimeout(() => setMessage(""), 3000);
            return
        }
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch("/api/roletas", {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (response.ok) {
                setMessage("Roleta criada com sucesso!")
                setShowCreateModal(false)
                setFormData({ nome: "", usuarios: [], validFrom: '', validUntil: '', funnelId: '' })
                setParticipantOrder([]);
                loadRoletas()
            } else {
                const errorData = await response.json();
                setMessage(`Erro ao criar roleta: ${errorData.error || 'Erro desconhecido'}`)
            }
        } catch (error) {
            setMessage("Erro ao criar roleta.")
        }
        setTimeout(() => setMessage(""), 5000);
    }

    const handleEditRoleta = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingRoleta) return
        if (formData.usuarios.length === 0) {
            setMessage("Selecione pelo menos um corretor ou gerente para a roleta.")
            setTimeout(() => setMessage(""), 3000);
            return
        }
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/roletas/${editingRoleta.id}`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, ativa: editingRoleta.ativa }),
            })
            if (response.ok) {
                setMessage("Roleta atualizada com sucesso!")
                setEditingRoleta(null)
                setFormData({ nome: "", usuarios: [], validFrom: '', validUntil: '', funnelId: '' })
                setParticipantOrder([]);
                loadRoletas()
            } else {
                setMessage("Erro ao atualizar roleta.")
            }
        } catch (error) {
            setMessage("Erro ao atualizar roleta.")
        }
        setTimeout(() => setMessage(""), 3000);
    }

    const handleDeleteRoleta = (roletaId: string) => {
        setRoletaToDelete(roletaId);
    }

    const confirmDeleteRoleta = async () => {
        if (!roletaToDelete) return;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/roletas/${roletaToDelete}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                setMessage("Roleta excluída com sucesso!");
                loadRoletas();
            } else {
                setMessage("Erro ao excluir roleta.");
            }
        } catch (error) {
            setMessage("Erro ao excluir roleta.");
        } finally {
            setRoletaToDelete(null);
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleToggleActive = async (roleta: Roleta) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/roletas/${roleta.id}`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: roleta.nome,
                    usuarios: roleta.usuarios.map((u) => u.id),
                    ativa: !roleta.ativa,
                    funnelId: roleta.funnelId
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
        setTimeout(() => setMessage(""), 3000);
    }

    const openEditModal = (roleta: Roleta) => {
        setEditingRoleta(roleta)
        setFormData({
            nome: roleta.nome,
            usuarios: roleta.usuarios.map((u) => u.id),
            validFrom: roleta.validFrom ? new Date(roleta.validFrom).toISOString().slice(0, 16) : '',
            validUntil: roleta.validUntil ? new Date(roleta.validUntil).toISOString().slice(0, 16) : '',
            funnelId: roleta.funnelId || '',
        })
        const selectedUsers = allUsers.filter(u => roleta.usuarios.some(ru => ru.id === u.id));
        setParticipantOrder(selectedUsers);
    }

    const handleUsuarioToggle = (participant: User) => {
        const isSelected = participantOrder.some(p => p.id === participant.id);
        let newOrder: User[];
        if (isSelected) {
            newOrder = participantOrder.filter(p => p.id !== participant.id);
        } else {
            newOrder = [...participantOrder, participant];
        }
        setParticipantOrder(newOrder);
        setFormData(prev => ({ ...prev, usuarios: newOrder.map(p => p.id) }));
    }

    const handleShuffleParticipants = () => {
        const shuffled = [...participantOrder];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setParticipantOrder(shuffled);
        setFormData(prev => ({ ...prev, usuarios: shuffled.map(p => p.id) }));
    };

    if (!user) { return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div> }
    if (!["marketing_adm", "diretor", "gerente", "corretor"].includes(user.role)) {
        return <div className="p-6"><Alert><AlertDescription>Acesso negado.</AlertDescription></Alert></div>
    }

    const currentActiveRoleta = useMemo(() => {
        const now = new Date().getTime();
        return roletas.find(r => {
            const isActive = r.ativa;
            const hasStarted = !r.validFrom || new Date(r.validFrom).getTime() <= now;
            const hasNotEnded = !r.validUntil || new Date(r.validUntil).getTime() >= now;
            return isActive && hasStarted && hasNotEnded;
        });
    }, [roletas]);

    const usersForRoleta = useMemo(() => allUsers.filter(u => u.role === 'corretor' || u.role === 'gerente'), [allUsers]);
    const funnelsForRoleta = useMemo(() => funnels.filter(f => !f.isPreSales), [funnels]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary-custom">Sistema de Roleta e Frequência</h1>
                    <p className="text-gray-600">Gerencie a distribuição de leads e a frequência da equipa.</p>
                </div>
            </div>

            {message && <Alert className="mb-4"><AlertDescription>{message}</AlertDescription></Alert>}

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className={`grid w-full ${user?.role === 'marketing_adm' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <TabsTrigger value="overview">Ordem de Atendimento</TabsTrigger>                    
                    {user?.role === 'marketing_adm' && (
                        <TabsTrigger value="manage">Gerenciar Roletas</TabsTrigger>
                    )}
                    <TabsTrigger value="frequencia">Frequência</TabsTrigger>                    
                </TabsList> 

                <TabsContent value="overview" className="mt-6">
                    <div className="flex justify-center">
                        {currentActiveRoleta ? (() => {
                            const roleta = currentActiveRoleta;
                            const nextCorretorIndex = roleta.usuarios.length > 0 ? (roleta.last_assigned_index + 1) % roleta.usuarios.length : 0;
                            return (
                                <Card key={roleta.id} className="w-full max-w-2xl">
                                    <CardHeader><CardTitle className="text-xl">{roleta.nome}</CardTitle><CardDescription>{roleta.funnel?.name || 'Sem funil associado'}</CardDescription></CardHeader>
                                    <CardContent>
                                        <div className="space-y-1">
                                            {roleta.usuarios.map((corretor, index) => {
                                                const isNext = index === nextCorretorIndex;
                                                const leadCount = corretor.leadCount ?? 0;
                                                return (
                                                    <div key={corretor.id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{corretor.nome || corretor.email}</p>
                                                            <p className={`text-sm font-semibold ${isNext ? 'text-green-600' : 'text-gray-500'}`}>{isNext ? 'NA VEZ - ' : ''}{leadCount} QUALIFICADO(S)</p>
                                                        </div>
                                                        <span className="text-lg font-medium text-gray-400">{index + 1}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })() : <p className="col-span-full text-center text-muted-foreground py-10">Nenhuma roleta programada para estar ativa no momento.</p>}
                    </div>
                </TabsContent>

                <TabsContent value="manage" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-primary-custom"><RotateCcw className="h-5 w-5" />Roletas Configuradas</CardTitle>
                                <CardDescription>Gerencie as roletas de distribuição de leads</CardDescription>
                            </div>
                        {user?.role === 'marketing_adm' && (
                            <Button onClick={() => { setShowCreateModal(true); setParticipantOrder([]); setFormData({ nome: "", usuarios: [], validFrom: '', validUntil: '', funnelId: '' }) }} className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                                <Plus className="h-4 w-4 mr-2" />Nova Roleta
                            </Button>
                        )}
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">Carregando...</div>
                            ) : roletas.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">Nenhuma roleta configurada.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Funil</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Corretores</TableHead>
                                                <TableHead>Período de Validade</TableHead>
                                                <TableHead>Último Atribuído</TableHead>
                                                <TableHead>Data de Criação</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {roletas.map((roleta) => (
                                                <TableRow key={roleta.id}>
                                                    <TableCell className="font-medium">{roleta.nome}</TableCell>
                                                    <TableCell>{roleta.funnel?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Switch checked={roleta.ativa} onCheckedChange={() => handleToggleActive(roleta)} />
                                                            <Badge variant={roleta.ativa ? "default" : "secondary"}>{roleta.ativa ? "Ativa" : "Inativa"}</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4 text-gray-500" />
                                                            <span>{roleta.usuarios.length}</span>
                                                            <div className="ml-2">
                                                                {roleta.usuarios.slice(0, 3).map((usuario) => (<Badge key={usuario.id} variant="outline" className="mr-1 text-xs">{(usuario.nome || 'N/A').split(" ")[0]}</Badge>))}
                                                                {roleta.usuarios.length > 3 && (<Badge variant="outline" className="text-xs">+{roleta.usuarios.length - 3}</Badge>)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {roleta.validFrom ? `De: ${safeFormatDateTime(roleta.validFrom)}` : 'Desde sempre'}<br />
                                                        {roleta.validUntil ? `Até: ${safeFormatDateTime(roleta.validUntil)}` : 'Para sempre'}
                                                    </TableCell>
                                                    <TableCell>{roleta.usuarios.length > 0 && roleta.last_assigned_index < roleta.usuarios.length ? roleta.usuarios[roleta.last_assigned_index]?.nome || "N/A" : "Nenhum"}</TableCell>
                                                    <TableCell>{safeFormatDate(roleta.created_at, "dd/MM/yyyy")}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                        {user?.role === 'marketing_adm' && (
                                                            <>
                                                                <Button size="sm" variant="ghost" onClick={() => openEditModal(roleta)}><Edit className="h-4 w-4" /></Button>
                                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRoleta(roleta.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                                                            </>
                                                        )}
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
                </TabsContent>

                <TabsContent value="frequencia" className="mt-6">
                    {isClient && <FrequenciaTabContent />}
                </TabsContent>
            </Tabs>

            {/* Modais */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Criar Nova Roleta</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateRoleta} className="space-y-4 pt-4">
                        <div>
                            <Label htmlFor="nome">Nome da Roleta</Label>
                            <Input id="nome" value={formData.nome} onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Roleta Principal" required />
                        </div>
                        <div>
                            <Label htmlFor="funnelId">Funil de Vendas</Label>
                            <Select value={formData.funnelId} onValueChange={(value) => setFormData(prev => ({ ...prev, funnelId: value }))}>
                                <SelectTrigger id="funnelId"><SelectValue placeholder="Selecione um funil" /></SelectTrigger>
                                <SelectContent>{funnelsForRoleta.map(funnel => (<SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="validFrom">Válida a partir de</Label>
                                <Input id="validFrom" type="datetime-local" value={formData.validFrom || ''} onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="validUntil">Válida até</Label>
                                <Input id="validUntil" type="datetime-local" value={formData.validUntil || ''} onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Participantes</Label>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                {usersForRoleta.map((participant) => (
                                    <div key={participant.id} className="flex items-center space-x-2">
                                        <input type="checkbox" id={`participant_${participant.id}`} checked={participantOrder.some(p => p.id === participant.id)} onChange={() => handleUsuarioToggle(participant)} />
                                        <label htmlFor={`participant_${participant.id}`} className="text-sm">{participant.nome} ({participant.role})</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={handleShuffleParticipants} disabled={participantOrder.length < 2}><Shuffle className="h-4 w-4 mr-2" />Embaralhar</Button>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">Criar Roleta</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingRoleta} onOpenChange={(isOpen) => !isOpen && setEditingRoleta(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Editar Roleta</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditRoleta} className="space-y-4 pt-4">
                        <div>
                            <Label htmlFor="edit_nome">Nome da Roleta</Label>
                            <Input id="edit_nome" value={formData.nome} onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))} required />
                        </div>
                        <div>
                            <Label htmlFor="edit_funnelId">Funil de Vendas</Label>
                            <Select value={formData.funnelId} onValueChange={(value) => setFormData(prev => ({ ...prev, funnelId: value }))}>
                                <SelectTrigger id="edit_funnelId"><SelectValue placeholder="Selecione um funil" /></SelectTrigger>
                                <SelectContent>{funnelsForRoleta.map(funnel => (<SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit_validFrom">Válida a partir de</Label>
                                <Input id="edit_validFrom" type="datetime-local" value={formData.validFrom || ''} onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="edit_validUntil">Válida até</Label>
                                <Input id="edit_validUntil" type="datetime-local" value={formData.validUntil || ''} onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Participantes</Label>
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                {participantOrder.map((participant) => (
                                    <div key={participant.id} className="flex items-center space-x-2">
                                        <input type="checkbox" id={`edit_participant_${participant.id}`} checked={true} onChange={() => handleUsuarioToggle(participant)} />
                                        <label htmlFor={`edit_participant_${participant.id}`} className="text-sm">{participant.nome} ({participant.role})</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={handleShuffleParticipants} disabled={participantOrder.length < 2}><Shuffle className="h-4 w-4 mr-2" />Embaralhar</Button>
                            <Button type="button" variant="outline" onClick={() => setEditingRoleta(null)}>Cancelar</Button>
                            <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">Salvar Alterações</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!roletaToDelete} onOpenChange={() => setRoletaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. Isto irá excluir permanentemente a roleta.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRoletaToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteRoleta}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
