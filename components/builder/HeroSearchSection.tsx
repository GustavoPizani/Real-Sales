import React from 'react';
import { Search, MapPin, BedDouble, DollarSign } from 'lucide-react';

export interface HeroProps {
  title?: string;
  subtitle?: string;
  backgroundImageUrl?: string;
}

export default function HeroSearchSection({
  title = "Encontre o imóvel dos seus sonhos",
  subtitle = "As melhores opções de casas e apartamentos na região.",
  backgroundImageUrl
}: HeroProps) {
  return (
    <section className="relative w-full h-[600px] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img src={backgroundImageUrl || "https://images.unsplash.com/photo-1600596542815-2a4d04774c13?q=80&w=2075&auto=format&fit=crop"} alt="Bg" className="w-full h-full object-cover" />
      </div>
      <div className="relative z-20 container mx-auto px-4 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-4 drop-shadow-md">{title}</h1>
        <p className="text-lg md:text-xl text-white/90 text-center mb-10 max-w-2xl drop-shadow-sm">{subtitle}</p>
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase flex gap-1"><MapPin className="w-3 h-3"/> Localização</label>
              <select className="w-full h-10 border rounded px-2"><option>Selecione...</option></select>
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase flex gap-1"><BedDouble className="w-3 h-3"/> Quartos</label>
              <select className="w-full h-10 border rounded px-2"><option>2+</option></select>
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase flex gap-1"><DollarSign className="w-3 h-3"/> Valor</label>
              <select className="w-full h-10 border rounded px-2"><option>Qualquer</option></select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center justify-center gap-2"><Search className="w-4 h-4"/> Buscar</button>
            </div>
        </div>
      </div>
    </section>
  );
}
