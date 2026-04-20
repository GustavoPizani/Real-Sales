"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Video, Megaphone } from "lucide-react";

interface CreativeViewProps {
  data?: any[];
  isLoading?: boolean;
}

export const CreativeView = ({ data = [], isLoading = false }: CreativeViewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Tela de Loading (Esqueleto Escuro)
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <Skeleton className="h-4 w-2/3 bg-[#333]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full bg-[#333]" />
                <Skeleton className="h-10 w-full bg-[#333]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Estado Vazio
  if (!data || data.length === 0) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333] text-center py-12 col-span-full">
        <CardContent className="text-gray-400 flex flex-col items-center justify-center pt-6">
          <Megaphone className="h-12 w-12 mb-4 text-[#333]" />
          <p>Nenhum criativo encontrado neste período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((creative, index) => {
        const isVideo = creative.ad_name?.toLowerCase().includes('video');

        return (
          // Card escuro com hover dourado suave
          <Card 
            key={index} 
            className="bg-[#1A1A1A] border-[#333] text-white overflow-hidden hover:border-[#aa8d44]/50 transition-all duration-300 shadow-lg"
          >
            <CardHeader className="p-4 border-b border-[#333] bg-black/40">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-sm font-medium line-clamp-2 leading-snug" title={creative.ad_name}>
                  {creative.ad_name}
                </CardTitle>
                <Badge variant="outline" className="bg-[#aa8d44]/10 text-[#aa8d44] border-[#aa8d44]/30 shrink-0">
                  {isVideo ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                  {isVideo ? 'Vídeo' : 'Imagem'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-4">
                {/* O rosa foi removido daqui e substituído por branco */}
                <div>
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Investimento</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(creative.spend)}</p>
                </div>
                
                {/* Leads em destaque dourado */}
                <div>
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Leads</p>
                  <p className="text-xl font-bold text-[#aa8d44]">{creative.leads}</p>
                </div>
                
                <div className="pt-2 border-t border-[#333]">
                  <p className="text-xs text-gray-400 mb-1">CPL</p>
                  <p className="text-sm font-medium text-gray-200">{formatCurrency(creative.cpl)}</p>
                </div>
                
                <div className="pt-2 border-t border-[#333]">
                  <p className="text-xs text-gray-400 mb-1">Cliques (CTR)</p>
                  <p className="text-sm font-medium text-gray-200">
                    {creative.clicks} <span className="text-gray-500 text-xs">({creative.ctr?.toFixed(2)}%)</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};