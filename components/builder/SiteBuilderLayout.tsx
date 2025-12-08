import React, { useState } from 'react';
import { ArrowLeft, Layout, Palette, Settings, Monitor, Smartphone, Save, Eye } from 'lucide-react';
import Link from 'next/link';

interface SiteBuilderLayoutProps {
  children: React.ReactNode;
  onPublish: () => void;
  onBack: () => void;
}

export default function SiteBuilderLayout({ children, onPublish, onBack }: SiteBuilderLayoutProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'appearance' | 'settings'>('sections');

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
           <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
             <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao CRM
           </button>
        </div>
        <div className="flex border-b border-gray-200">
          {['sections', 'appearance', 'settings'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-sm font-medium flex flex-col items-center gap-1 border-b-2 capitalize ${activeTab === tab ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500'}`}>
                {tab === 'sections' && <Layout className="w-4 h-4" />}
                {tab === 'appearance' && <Palette className="w-4 h-4" />}
                {tab === 'settings' && <Settings className="w-4 h-4" />}
                {tab === 'sections' ? 'Seções' : tab === 'appearance' ? 'Aparência' : 'Config'}
             </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'sections' && ['Cabeçalho', 'Hero Search', 'Imóveis Destaque', 'Sobre Nós', 'Rodapé'].map((item) => (
            <div key={item} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm cursor-grab hover:border-rose-400 transition-colors flex justify-between group">
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
           <button onClick={onPublish} className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium text-sm flex items-center justify-center gap-2">
             <Save className="w-4 h-4" /> Publicar
           </button>
        </div>
      </aside>
      {/* Preview Area */}
      <main className="flex-1 flex flex-col relative">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
             <button className="p-1.5 bg-white rounded shadow-sm text-gray-700"><Monitor className="w-4 h-4" /></button>
             <button className="p-1.5 text-gray-500 hover:text-gray-700"><Smartphone className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 bg-gray-200/50 p-8 overflow-auto flex justify-center">
          <div className="w-full max-w-[1200px] bg-white min-h-full shadow-2xl ring-1 ring-black/5 rounded-sm overflow-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
