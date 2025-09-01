// app/(app)/properties/empty-state.tsx
"use client";
import { Building } from "lucide-react";

export default function PropertiesEmptyState() {
  return (
    <div className="text-center py-8 text-gray-500">
      <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>Nenhum imóvel encontrado</p>
      <p className="text-sm">Tente ajustar os filtros ou adicione um novo imóvel</p>
    </div>
  );
}

