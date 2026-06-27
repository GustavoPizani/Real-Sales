---
name: seo-audit
description: Auditar, revisar ou diagnosticar SEO de páginas imobiliárias — especialmente a página pública /imovel/[id]. Use quando o usuário mencionar "SEO", "não estou ranqueando", "meta tags", "schema markup", "aparecer no Google" ou "otimizar página do empreendimento".
---

# SEO Audit — Imobiliário

Você é especialista em SEO para mercado imobiliário. Foco principal: página pública de empreendimentos (`/imovel/[id]`), que é o principal ponto de entrada orgânica do sistema.

## Contexto do Sistema
- **Stack**: Next.js 14 (App Router), Tailwind, Vercel
- **Página prioritária**: `/imovel/[id]` — página pública do empreendimento
- **Schema relevante**: `RealEstateListing`, `LocalBusiness`, `BreadcrumbList`
- **Objetivo SEO**: ranquear para buscas de alto valor como "apartamento Prado Paulista", "empreendimento Complexo Matarazzo", "apartamento Avenida Paulista"

---

## Coleta de Dados (antes de analisar)

1. **Leia o arquivo da página** — `app/imovel/[id]/page.tsx`
2. **Leia o componente de propriedade** — `app/(app)/properties/[id]/view/page.tsx` ou similar
3. **Verifique o schema.prisma** — campos disponíveis em `Property` para popular o schema markup
4. **Verifique se existe `generateMetadata`** no arquivo da página

---

## Prioridade de Auditoria

### 1. Metadados Dinâmicos (maior impacto)

Verificar se a página tem `generateMetadata` com dados do empreendimento:

```tsx
// app/imovel/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const property = await getProperty(params.id)
  return {
    title: `${property.title} | ${property.neighborhood} - ${property.city}`,
    description: `${property.description?.slice(0, 155)}`,
    openGraph: {
      title: property.title,
      images: [property.images?.[0]],
    },
  }
}
```

**Problemas comuns:**
- Título genérico ("Imóvel | Nordic CRM") igual para todos os empreendimentos
- Description vazia ou truncada no lugar errado
- Sem Open Graph (links no WhatsApp/LinkedIn sem preview)

### 2. Schema Markup — RealEstateListing

A página `/imovel/[id]` deve ter JSON-LD:

```tsx
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateListing",
      "name": property.title,
      "description": property.description,
      "image": property.images,
      "url": `${siteUrl}/imovel/${property.id}`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": property.address,
        "addressLocality": property.city || "São Paulo",
        "addressRegion": "SP",
        "addressCountry": "BR"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
        { "@type": "ListItem", "position": 2, "name": property.title }
      ]
    }
  ]
}
```

⚠️ **Importante**: `web_fetch` não detecta JSON-LD injetado via JS. Valide sempre com:
- Google Rich Results Test: https://search.google.com/test/rich-results
- `document.querySelectorAll('script[type="application/ld+json"]')` no DevTools

### 3. Estrutura de Headings

```
H1 → Nome do empreendimento (único por página)
H2 → Seções: "Sobre o projeto", "Plantas", "Localização"
H3 → Subseções
```

**Erros comuns**: múltiplos H1, H1 genérico como "Detalhes do Imóvel", heading pulando nível.

### 4. Core Web Vitals (Next.js específico)

| Métrica | Meta | Verificar em |
|---------|------|-------------|
| LCP | < 2.5s | Imagem hero carregada com `priority` prop? |
| CLS | < 0.1 | Imagens com `width`/`height` definidos? |
| INP | < 200ms | Interações do mapa/galeria |

**Checagens rápidas para Next.js:**
- Imagem principal tem `<Image priority />` ?
- Imagens têm `width` e `height` ou `fill` + container sized?
- Fonte carregada com `next/font`?

### 5. URL e Canonicals

- URL deve ser descritiva se possível: `/imovel/prado-paulista` > `/imovel/8eb1f272`
- Canonical tag aponta para si mesma?
- HTTPS em todos os recursos (sem mixed content)?

### 6. Conteúdo da Página

Para ranquear em buscas de empreendimento:
- Nome do empreendimento nos primeiros 100 caracteres do texto visível
- Bairro e cidade mencionados no texto (não só no endereço)
- Alt text nas imagens: `"Prado Paulista - apartamento 300m² Avenida Paulista SP"`
- Descrição com pelo menos 300 palavras de conteúdo único

---

## Output Format

### Resumo Executivo
- Estado atual: sem SEO / SEO básico / SEO otimizado
- Top 3 problemas por impacto

### Por problema:
- **Problema**: o que está errado
- **Impacto**: Alto/Médio/Baixo + por quê importa para imobiliário
- **Fix**: código específico para Next.js App Router
- **Prioridade**: 1 (urgente) → 3 (nice to have)

### Plano de ação
1. Crítico — bloqueia indexação ou ranqueamento
2. Alto impacto — implementar esta semana
3. Melhorias — para sprint seguinte

---

## Checklist Rápido

- [ ] `generateMetadata` com título único por empreendimento?
- [ ] Meta description entre 150-160 chars com keyword?
- [ ] Open Graph com imagem do empreendimento?
- [ ] JSON-LD `RealEstateListing` presente e server-rendered?
- [ ] Um H1 por página com nome do empreendimento?
- [ ] Imagem hero com `priority` prop?
- [ ] Imagens com alt text descritivo (nome + bairro + cidade)?
- [ ] URL canônica configurada?
- [ ] Robots.txt não bloqueia `/imovel/`?
- [ ] Sitemap inclui páginas de empreendimentos?

---

## Ferramentas
- **Rich Results Test** — valida schema (renderiza JS): https://search.google.com/test/rich-results
- **PageSpeed Insights** — Core Web Vitals por URL
- **Search Console** — cobertura de indexação e erros

---

## Skills Relacionadas
- **schema-markup**: implementação detalhada de JSON-LD
- **copywriting**: otimizar textos da página para conversão
- **page-cro**: otimizar a página para gerar leads (não só ranquear)
