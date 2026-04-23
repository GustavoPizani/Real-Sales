"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Trash2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = "ads-intel-hub-2024";

const API_KEYS = [
  { key: "META_APP_ID", label: "Meta App ID", placeholder: "Seu Meta App ID" },
  { key: "META_APP_SECRET", label: "Meta App Secret", placeholder: "Seu Meta App Secret" },
  { key: "META_ACCESS_TOKEN", label: "Meta Access Token", placeholder: "Seu Meta Access Token" },
  { key: "META_PIXEL_ID", label: "Meta Pixel ID", placeholder: "Seu Meta Pixel ID" },
  { key: "GEMINI_API_KEY", label: "Chave da IA (Groq / Llama 3)", placeholder: "Sua chave gsk_..." },
];

export default function MarketingSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<string[]>([""]);
  const { toast } = useToast();

  const encrypt = (text: string) => CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  const decrypt = (ciphertext: string) => {
    try { return CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8); }
    catch { return ""; }
  };

  useEffect(() => {
    const fetchUserAndSettings = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUserId(user.id); await loadSettings(user.id); }
      else { setLoading(false); }
    };
    fetchUserAndSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async (uid: string) => {
    try {
      const { data, error } = await supabase.from("api_settings").select("*").eq("user_id", uid);
      if (error) throw error;
      const decryptedSettings: Record<string, string> = {};
      data?.forEach((item) => {
        const val = decrypt(item.encrypted_value);
        if (val) decryptedSettings[item.setting_key] = val;
      });
      setSettings(decryptedSettings);
      if (decryptedSettings.META_AD_ACCOUNT_IDS) {
        const accounts = decryptedSettings.META_AD_ACCOUNT_IDS.split(",").filter(Boolean);
        setAdAccounts(accounts.length > 0 ? accounts : [""]);
      }
    } catch (error: any) {
      toast({ title: "Erro", description: "Falha ao carregar chaves.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string) => {
    if (!userId) return;
    const value = settings[key];
    if (!value?.trim()) return toast({ title: "Erro", description: "Campo vazio.", variant: "destructive" });
    setSaving(key);
    try {
      const encrypted = encrypt(value);
      const { error } = await supabase.from("api_settings").upsert(
        { user_id: userId, setting_key: key, encrypted_value: encrypted },
        { onConflict: "user_id,setting_key" }
      );
      if (error) throw error;
      toast({ title: "Sucesso", description: "Chave salva." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  const deleteSetting = async (key: string) => {
    if (!userId) return;
    setSaving(key);
    try {
      const { error } = await supabase.from("api_settings").delete().eq("user_id", userId).eq("setting_key", key);
      if (error) throw error;
      setSettings((prev) => { const n = { ...prev }; delete n[key]; return n; });
      toast({ title: "Removido", description: "Chave removida." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  const isConfigured = (key: string) => Boolean(settings[key]?.trim());

  const saveAdAccounts = async () => {
    if (!userId) return;
    const valid = adAccounts.filter((a) => a.trim());
    if (!valid.length) return toast({ title: "Erro", description: "Adicione uma conta.", variant: "destructive" });
    setSaving("META_AD_ACCOUNT_IDS");
    try {
      const enc = encrypt(valid.join(","));
      const { error } = await supabase.from("api_settings").upsert(
        { user_id: userId, setting_key: "META_AD_ACCOUNT_IDS", encrypted_value: enc },
        { onConflict: "user_id,setting_key" }
      );
      if (error) throw error;
      setSettings((p) => ({ ...p, META_AD_ACCOUNT_IDS: valid.join(",") }));
      toast({ title: "Sucesso", description: "Contas salvas." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações do Dashboard</h1>
        <p className="text-muted-foreground">Gerencie as APIs e integrações do painel de marketing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-secondary-custom" />
            API Vault
          </CardTitle>
          <CardDescription>
            Gerencie suas chaves de integração com criptografia AES-256.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {API_KEYS.map((apiKey) => (
            <div key={apiKey.key} className="space-y-3 group">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground group-hover:text-secondary-custom transition-colors">
                  {apiKey.label}
                  {isConfigured(apiKey.key)
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-amber-500" />}
                </Label>
                {isConfigured(apiKey.key) && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">Ativo</span>
                )}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); saveSetting(apiKey.key); }}>
                <div className="relative flex-1">
                  <Input
                    type={visibility[apiKey.key] ? "text" : "password"}
                    value={settings[apiKey.key] || ""}
                    onChange={(e) => setSettings({ ...settings, [apiKey.key]: e.target.value })}
                    placeholder={apiKey.placeholder}
                    autoComplete="off"
                    className="pr-10 font-mono text-sm h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setVisibility({ ...visibility, [apiKey.key]: !visibility[apiKey.key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {visibility[apiKey.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" variant="outline" size="icon" disabled={saving === apiKey.key} className="h-11 w-11">
                  <Save className="w-4 h-4" />
                </Button>
                {isConfigured(apiKey.key) && (
                  <Button type="button" variant="outline" size="icon" onClick={() => deleteSetting(apiKey.key)} disabled={saving === apiKey.key} className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </form>
            </div>
          ))}

          <div className="space-y-3 pt-6 border-t border-border">
            <Label className="text-sm font-medium text-muted-foreground">Contas de Anúncio Meta (IDs)</Label>
            {adAccounts.map((account, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={account}
                  onChange={(e) => {
                    const newAccounts = [...adAccounts];
                    newAccounts[index] = e.target.value;
                    setAdAccounts(newAccounts);
                  }}
                  placeholder="act_..."
                  className="h-11"
                />
                {adAccounts.length > 1 && (
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setAdAccounts(adAccounts.filter((_, i) => i !== index))}
                    className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setAdAccounts([...adAccounts, ""])} className="text-secondary-custom hover:text-secondary-custom/80 hover:bg-transparent">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Conta
              </Button>
              <Button onClick={saveAdAccounts} disabled={saving === "META_AD_ACCOUNT_IDS"} className="ml-auto bg-secondary-custom hover:bg-secondary-custom/90 text-primary-custom font-bold">
                {saving === "META_AD_ACCOUNT_IDS" ? "Salvando..." : "Salvar Contas"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
