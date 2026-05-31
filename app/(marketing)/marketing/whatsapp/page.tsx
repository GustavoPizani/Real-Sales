"use client";

import { useState, useEffect } from "react";
import { QrCode, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function WhatsAppConnectionPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"IDLE" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "ERROR">("IDLE");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/sessions/waha/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.qrCode) {
          setQrCodeData(data.qrCode);
        }
        return data.status;
      }
    } catch (err) {
      console.error(err);
    }
    return "ERROR";
  };

  const startConnection = async () => {
    setLoading(true);
    setStatus("STARTING");
    try {
      const res = await fetch("/api/sessions/waha/ensure", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao iniciar sessão");
      
      const data = await res.json();
      setStatus(data.status);
      if (data.qrCode) setQrCodeData(data.qrCode);
      
      toast({ title: "Sessão iniciada", description: "Aguarde a geração do QR Code..." });
    } catch (err: any) {
      setStatus("ERROR");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkStatus();
    
    // Polling if waiting for QR or starting
    const interval = setInterval(() => {
      if (status === "STARTING" || status === "SCAN_QR_CODE") {
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Conexão WhatsApp (SDR)</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-colors hover:border-secondary-custom/50 border-2">
          <CardHeader>
            <CardTitle className="text-secondary-custom">Status do Canal</CardTitle>
            <CardDescription>Conecte o WhatsApp para o Bot SDR operar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center justify-center py-6">
            
            {status === "IDLE" || status === "STOPPED" || status === "ERROR" ? (
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">O WhatsApp não está conectado.</p>
                <Button 
                  onClick={startConnection} 
                  disabled={loading}
                  className="bg-secondary-custom text-white hover:bg-secondary-custom/80 font-semibold"
                >
                  <QrCode className="mr-2 h-4 w-4" /> 
                  Conectar WhatsApp
                </Button>
              </div>
            ) : null}

            {status === "STARTING" && (
              <div className="text-center space-y-4">
                <RefreshCw className="w-16 h-16 text-secondary-custom mx-auto animate-spin" />
                <p className="text-muted-foreground animate-pulse">Iniciando sessão no servidor...</p>
              </div>
            )}

            {status === "SCAN_QR_CODE" && qrCodeData && (
              <div className="text-center space-y-4">
                <p className="font-medium text-secondary-custom">Escaneie o QR Code abaixo:</p>
                <div className="bg-white p-4 rounded-xl inline-block">
                  {/* Waha returns Base64 image data string */}
                  <img src={qrCodeData.startsWith('data:image') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} alt="QR Code" className="w-64 h-64 object-contain" />
                </div>
                <p className="text-sm text-muted-foreground">Abra o WhatsApp no celular, vá em Dispositivos Conectados e aponte a câmera.</p>
              </div>
            )}

            {status === "WORKING" && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-20 h-20 text-secondary-custom mx-auto" />
                <h3 className="text-2xl font-bold text-secondary-custom">Conectado!</h3>
                <p className="text-muted-foreground">O Bot SDR está pronto para receber e enviar mensagens.</p>
              </div>
            )}

          </CardContent>
        </Card>
        
        <Card className="transition-colors hover:border-secondary-custom/50 border-2">
          <CardHeader>
            <CardTitle className="text-secondary-custom">Instruções Operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>1. <strong>Importante:</strong> Use um número exclusivo para o Bot SDR. Não use o seu número pessoal.</p>
            <p>2. Ao ler o QR Code, o painel fará a integração direta entre o Real-Sales e o provedor Waha na nuvem.</p>
            <p>3. Todas as mensagens recebidas nesse número entrarão na fila de processamento da IA.</p>
            <p>4. Se a sessão desconectar, volte nesta página para ler o QR Code novamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
