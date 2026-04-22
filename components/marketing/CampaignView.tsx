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
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-none shadow-none text-foreground overflow-hidden">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-secondary-custom" />
          <CardTitle className="text-xl font-bold text-secondary-custom">
            Performance por Campanha
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-custom-lg">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-wider">Campanha</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold uppercase text-xs tracking-wider">Investimento</TableHead>
                <TableHead className="text-center text-muted-foreground font-bold uppercase text-xs tracking-wider">Leads</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold uppercase text-xs tracking-wider">CPL</TableHead>
                <TableHead className="text-center text-muted-foreground font-bold uppercase text-xs tracking-wider">Cliques</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold uppercase text-xs tracking-wider">CPC</TableHead>
                <TableHead className="text-right text-secondary-custom font-bold uppercase text-xs tracking-wider">CTR</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma campanha ativa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className="border-b border-border hover:bg-secondary-custom/10 transition-colors group"
                  >
                    <TableCell className="font-semibold text-foreground max-w-[250px] truncate">
                      {row.campaign_name}
                    </TableCell>
                    
                    {/* Investimento em branco puro */}
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(row.spend)}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge className="bg-secondary-custom text-primary-custom font-bold hover:bg-secondary-custom/80">
                        {formatNumber(row.leads)}
                      </Badge>
                    </TableCell>
                    
                    {/* CPL em destaque se for baixo */}
                    <TableCell className="text-right font-bold text-secondary-custom">
                      {formatCurrency(row.cpl)}
                    </TableCell>
                    
                    <TableCell className="text-center text-muted-foreground">
                      {formatNumber(row.clicks)}
                    </TableCell>
                    
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(row.cpc)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-foreground">
                        <TrendingUp className="w-3 h-3 text-secondary-custom" />
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