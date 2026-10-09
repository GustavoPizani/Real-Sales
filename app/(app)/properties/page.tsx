// app/(app)/properties/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BedDouble, Building, Layers, MapPin, Pencil, Plus, RefreshCw, Ruler, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyStatus } from "@/lib/types";
import { DASH_CARD, DASH_PANEL, DASH_SURFACE } from "@/components/dashboard/ui";
import PropertiesEmptyState from "./empty-state";

// O que /api/properties devolve (campos do banco, não os de lib/types).
interface PropertyTypology {
  id: string;
  name: string;
  value: number;
  area: number | null;
  dormitorios: number | null;
}

interface PropertyListItem {
  id: string;
  title: string;
  address: string | null;
  type: string | null;
  status: PropertyStatus;
  images: { id: string; url: string }[];
  propertyTypes: PropertyTypology[];
}

const ALL = "all";
// Cartões de cerca de 15rem: a grade encaixa quantas colunas couberem (4 num notebook, 1 no celular).
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] lg:gap-4";

// Cada status tem rótulo e um ponto de cor: a cor nunca é o único sinal.
const STATUS: Record<PropertyStatus, { label: string; dot: string }> = {
  [PropertyStatus.LANCAMENTO]: { label: "Lançamento", dot: "bg-[var(--accent-primary)]" },
  [PropertyStatus.EM_OBRAS]: { label: "Em obras", dot: "bg-amber-500" },
  [PropertyStatus.PRONTO]: { label: "Pronto", dot: "bg-emerald-500" },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: ALL, label: "Todos" },
  { value: PropertyStatus.LANCAMENTO, label: "Lançamento" },
  { value: PropertyStatus.EM_OBRAS, label: "Em obras" },
  { value: PropertyStatus.PRONTO, label: "Pronto" },
];

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

/** "2 a 3" quando os valores variam, "2" quando são iguais, null quando não há dado. */
function rangeOf(values: (number | null | undefined)[]): string | null {
  const known = values.filter((v): v is number => typeof v === "number" && v > 0);
  if (known.length === 0) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const format = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return min === max ? format(min) : `${format(min)} a ${format(max)}`;
}

function PropertyCard({ property }: { property: PropertyListItem }) {
  const cover = property.images[0]?.url;
  const status = STATUS[property.status];
  const prices = property.propertyTypes.map(t => t.value).filter(v => v > 0);
  const bedrooms = rangeOf(property.propertyTypes.map(t => t.dormitorios));
  const area = rangeOf(property.propertyTypes.map(t => t.area));
  const typologyCount = property.propertyTypes.length;

  return (
    <li className={`group relative flex flex-col overflow-hidden ${DASH_CARD}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Building className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}
        {status && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
            {status.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0">
          {/* O link cobre o cartão inteiro (after:inset-0); o botão Editar fica por cima dele. */}
          <Link
            href={`/properties/${property.id}/view`}
            className="block truncate text-sm font-semibold text-foreground after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {property.title}
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{property.address || "Endereço não informado"}</span>
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {bedrooms && (
            <li className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />{bedrooms} dorm.
            </li>
          )}
          {area && (
            <li className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" aria-hidden="true" />{area} m²
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {typologyCount === 0 ? "Sem tipologias" : `${typologyCount} ${typologyCount === 1 ? "tipologia" : "tipologias"}`}
          </li>
          {property.type && <li>{property.type}</li>}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            {prices.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="truncate text-base font-semibold tracking-tight tabular-nums text-foreground">{formatBRL(Math.min(...prices))}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Preço não informado</p>
            )}
          </div>
          <Button asChild variant="outline" className="relative z-10 h-9 flex-shrink-0 rounded-full px-3.5 text-xs">
            <Link href={`/properties/${property.id}/edit`} aria-label={`Editar ${property.title}`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Editar
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const response = await fetch("/api/properties");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // As opções de tipo vêm dos próprios imóveis: o tipo é texto livre no cadastro.
  const typeOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const p of properties) {
      const type = p.type?.trim();
      if (type && !byKey.has(type.toLowerCase())) byKey.set(type.toLowerCase(), type);
    }
    return Array.from(byKey.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return properties.filter(property => {
      const matchesSearch =
        !term || property.title.toLowerCase().includes(term) || !!property.address?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === ALL || property.status === statusFilter;
      const matchesType = typeFilter === ALL || property.type?.trim().toLowerCase() === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [properties, searchTerm, statusFilter, typeFilter]);

  const hasFilters = !!searchTerm.trim() || statusFilter !== ALL || typeFilter !== ALL;
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter(ALL);
    setTypeFilter(ALL);
  };

  const newPropertyButton = (
    <Button asChild className="h-11 rounded-full px-5">
      <Link href="/properties/new"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Novo imóvel</Link>
    </Button>
  );

  return (
    <div className="p-3 md:p-4">
      <div className={`space-y-5 sm:space-y-6 ${DASH_PANEL}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Imóveis</h1>
            <p className="text-sm text-muted-foreground">Empreendimentos e imóveis disponíveis para oferecer aos clientes.</p>
          </div>
          {newPropertyButton}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Buscar imóvel por nome ou endereço"
              placeholder="Buscar por nome ou endereço..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`rounded-full pl-10 ${DASH_SURFACE}`}
            />
          </div>

          <div className={`flex max-w-full gap-1 overflow-x-auto rounded-full p-1 ${DASH_SURFACE}`} role="group" aria-label="Filtrar por status">
            {STATUS_FILTERS.map(option => {
              const active = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(option.value)}
                  className={`h-9 flex-shrink-0 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {typeOptions.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger aria-label="Filtrar por tipo" className={`w-full rounded-full sm:w-48 ${DASH_SURFACE}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {typeOptions.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button variant="ghost" className="rounded-full" onClick={clearFilters}>
              <X className="mr-1.5 h-4 w-4" aria-hidden="true" />Limpar filtros
            </Button>
          )}

          {!loading && !hasError && properties.length > 0 && (
            <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
              <span className="font-semibold tabular-nums text-foreground">{filteredProperties.length}</span>{" "}
              {hasFilters ? `de ${properties.length} ` : ""}
              {filteredProperties.length === 1 && !hasFilters ? "imóvel" : "imóveis"}
            </p>
          )}
        </div>

        {loading ? (
          <ul className={GRID} aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className={`overflow-hidden ${DASH_CARD}`}>
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        ) : hasError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Não foi possível carregar a lista de imóveis.</p>
            <Button variant="outline" className="rounded-full" onClick={fetchProperties}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Tentar de novo
            </Button>
          </div>
        ) : properties.length === 0 ? (
          <PropertiesEmptyState
            title="Nenhum imóvel cadastrado"
            description="Cadastre o primeiro empreendimento para vincular aos clientes e compartilhar com eles."
            action={newPropertyButton}
          />
        ) : filteredProperties.length === 0 ? (
          <PropertiesEmptyState
            title="Nenhum imóvel com esses filtros"
            description="Tente outro termo de busca ou limpe os filtros para ver todos."
            action={<Button variant="outline" className="rounded-full" onClick={clearFilters}>Limpar filtros</Button>}
          />
        ) : (
          <ul className={GRID}>
            {filteredProperties.map(property => <PropertyCard key={property.id} property={property} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
