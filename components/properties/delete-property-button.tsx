"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Exclusão de imóvel com dupla confirmação: primeiro o aviso do que será
 * apagado, depois a digitação do nome do imóvel. Só aparece para o administrador
 * (a API recusa os demais).
 */
export function DeletePropertyButton({
  propertyId,
  title,
  interestedClientsCount,
}: {
  propertyId: string;
  title: string;
  /** Clientes com este imóvel como interesse; perdem o vínculo, não são apagados. */
  interestedClientsCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typedName, setTypedName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (user?.role !== "MARKETING_ADMIN") return null;

  const nameMatches = normalize(typedName) === normalize(title);

  const close = () => {
    if (isDeleting) return;
    setStep(0);
    setTypedName("");
  };

  const handleDelete = async () => {
    if (!nameMatches) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Não foi possível excluir o imóvel.");
      }
      const result = await res.json().catch(() => null);
      // O imóvel saiu; se algum arquivo não pôde ser apagado do armazenamento, avisa.
      toast(
        result?.filesFailed > 0
          ? { variant: "destructive", title: "Imóvel excluído, com pendência", description: `${result.filesFailed} arquivo(s) não puderam ser apagados do armazenamento.` }
          : { title: "Imóvel excluído", description: `"${title}" e os arquivos dele foram removidos.` },
      );
      router.push("/properties");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setStep(1)}
      >
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Excluir imóvel
      </Button>

      <Dialog open={step > 0} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent className="max-w-md">
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
                  Excluir este imóvel?
                </DialogTitle>
                <DialogDescription>
                  Você está prestes a excluir <span className="font-semibold text-foreground">{title}</span>. Isso não pode ser desfeito.
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>O cadastro, as tipologias, as fotos e as plantas são apagados, inclusive os arquivos.</li>
                <li>
                  {interestedClientsCount > 0
                    ? `${interestedClientsCount} ${interestedClientsCount === 1 ? "cliente tem" : "clientes têm"} este imóvel como interesse e ${interestedClientsCount === 1 ? "ficará" : "ficarão"} sem imóvel vinculado. Os clientes não são apagados.`
                    : "Nenhum cliente tem este imóvel como interesse."}
                </li>
                <li>Os links de compartilhamento deste imóvel são apagados e os já enviados deixam de funcionar.</li>
              </ul>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
                <Button type="button" variant="destructive" onClick={() => setStep(2)}>Continuar</Button>
              </DialogFooter>
            </>
          )}

          {step === 2 && (
            <form onSubmit={e => { e.preventDefault(); handleDelete(); }}>
              <DialogHeader>
                <DialogTitle>Confirme a exclusão</DialogTitle>
                <DialogDescription>
                  Para confirmar, digite o nome do imóvel: <span className="font-semibold text-foreground">{title}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="delete-property-name">Nome do imóvel</Label>
                <Input
                  id="delete-property-name"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={isDeleting}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={!nameMatches || isDeleting}>
                  {isDeleting ? "Excluindo..." : "Excluir definitivamente"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
