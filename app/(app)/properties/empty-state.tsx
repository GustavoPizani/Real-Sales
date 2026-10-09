// app/(app)/properties/empty-state.tsx
"use client";
import { Building } from "lucide-react";

/** Estado vazio da lista de imóveis: sem nenhum cadastrado, ou sem resultado para os filtros. */
export default function PropertiesEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
        <Building className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
