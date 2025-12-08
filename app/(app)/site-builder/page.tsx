"use client";

import React, { useEffect, useState } from "react";
import SiteBuilderLayout from "@/components/builder/SiteBuilderLayout";
import HeroSearchSection from "@/components/builder/HeroSearchSection";
import ListingGridSection from "@/components/builder/ListingGridSection";
import { Loader2 } from "lucide-react";

export default function SiteBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<any>(null);

  // 1. Load Data on Mount
  useEffect(() => {
    fetch("/api/site-builder")
      .then((res) => res.json())
      .then((data) => {
        setSiteData(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. Publish Action
  const handlePublish = async () => {
    const res = await fetch("/api/site-builder", {
      method: "POST",
      body: JSON.stringify({ siteId: siteData.id, sections: siteData.pages[0].sections }),
    });
    if (res.ok) alert("Site Publicado com Sucesso!");
  };
  
  const handleBack = () => window.location.href = '/properties';

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  // Pega as seções da Home (Page 0)
  const sections = siteData?.pages?.[0]?.sections || [];

  return (
    <SiteBuilderLayout onPublish={handlePublish} onBack={handleBack}>
      {/* FIX DE SCROLL: O container deve permitir crescer */}
      <div className="flex flex-col w-full bg-white min-h-full">
        {sections.map((section: any) => {
          if (section.type === "HERO_SEARCH") {
            return <HeroSearchSection key={section.id} {...section.content} />;
          }
          if (section.type === "LISTING_GRID") {
             // Passando dados mockados para o grid por enquanto, pois o content pode estar vazio
            return <ListingGridSection key={section.id} title={section.content.title} properties={[]} />;
          }
          return null;
        })}
      </div>
    </SiteBuilderLayout>
  );
}
