"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Target, MousePointer2 } from "lucide-react";

interface CampaignViewProps {
  data?: any[];
  isLoading?: boolean;
}

export const CampaignView = ({ data = [], isLoading = false }: CampaignViewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value || 0);
  };

  // Loading State
  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-[#333]" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-none shadow-none text-white overflow-hidden">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#aa8d44]" />
          <CardTitle className="text-xl font-bold text-[#D4AF37]">
            Performance por Campanha
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-xl border border-[#333] bg-[#1A1A1A] shadow-2xl">
          <Table>
            <TableHeader className="bg-black/60 border-b border-[#333]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-gray-400 font-bold uppercase text-xs tracking-wider">Campanha</TableHead>
                <TableHead className="text-right text-gray-400 font-bold uppercase text-xs tracking-wider">Investimento</TableHead>
                <TableHead className="text-center text-gray-400 font-bold uppercase text-xs tracking-wider">Leads</TableHead>
                <TableHead className="text-right text-gray-400 font-bold uppercase text-xs tracking-wider">CPL</TableHead>
                <TableHead className="text-center text-gray-400 font-bold uppercase text-xs tracking-wider">Cliques</TableHead>
                <TableHead className="text-right text-gray-400 font-bold uppercase text-xs tracking-wider">CPC</TableHead>
                <TableHead className="text-right text-[#aa8d44] font-bold uppercase text-xs tracking-wider">CTR</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    Nenhuma campanha ativa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className="border-b border-[#333]/50 hover:bg-[#aa8d44]/5 transition-colors group"
                  >
                    <TableCell className="font-semibold text-gray-100 max-w-[250px] truncate">
                      {row.campaign_name}
                    </TableCell>
                    
                    {/* Investimento em branco puro */}
                    <TableCell className="text-right font-medium text-white">
                      {formatCurrency(row.spend)}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge className="bg-[#aa8d44] text-black font-bold hover:bg-[#aa8d44]/80">
                        {formatNumber(row.leads)}
                      </Badge>
                    </TableCell>
                    
                    {/* CPL em destaque se for baixo */}
                    <TableCell className="text-right font-bold text-[#aa8d44]">
                      {formatCurrency(row.cpl)}
                    </TableCell>
                    
                    <TableCell className="text-center text-gray-300">
                      {formatNumber(row.clicks)}
                    </TableCell>
                    
                    <TableCell className="text-right text-gray-300">
                      {formatCurrency(row.cpc)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-gray-100">
                        <TrendingUp className="w-3 h-3 text-[#aa8d44]" />
                        {row.ctr?.toFixed(2)}%
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};