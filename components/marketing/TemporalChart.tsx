"use client";

import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- TOOLTIP PERSONALIZADO (Adaptado para o Dark Premium) ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-[#333] p-3 rounded-xl shadow-xl">
        {/* Data no topo */}
        <p className="text-gray-400 text-xs mb-2 font-medium border-b border-[#333] pb-1">
          {label ? format(new Date(label), "dd 'de' MMMM", { locale: ptBR }) : ""}
        </p>
        
        {/* Itens do Gráfico */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span className="text-xs font-bold" style={{ color: entry.color }}>
                {entry.name}:
              </span>
            </div>
            <span className="text-xs text-white font-mono">
              {new Intl.NumberFormat("pt-BR", { 
                style: "currency", 
                currency: "BRL" 
              }).format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TemporalChart = ({ data = [], isLoading = false }: any) => {
  if (isLoading) {
    return <Skeleton className="w-full h-[350px] bg-[#333]" />;
  }

  if (!data || data.length === 0) {
    return <div className="w-full h-[350px] flex items-center justify-center text-gray-500">Sem dados para o período</div>;
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} horizontal={true} />
          
          <XAxis 
            dataKey="date" 
            stroke="#888" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              try {
                return format(new Date(val), 'dd/MM', { locale: ptBR });
              } catch { return val; }
            }}
          />
          
          <YAxis 
            yAxisId="left"
            stroke="#888" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `R$${val}`}
          />
          
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#888" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `R$${val}`}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#333', opacity: 0.2 }} />
          
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Bar 
            yAxisId="left"
            dataKey="spend" 
            name="Investimento"
            fill="url(#colorSpend)" 
            stroke="#ffffff" 
            barSize={20}
            radius={[4, 4, 0, 0]}
          />
          
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="cpl" 
            name="CPL"
            stroke="#aa8d44"
            strokeWidth={3}
            dot={{ r: 4, fill: "#aa8d44", strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};