---
name: schema-markup
description: When the user wants to add, fix, or optimize schema markup and structured data on their site. Also use when the user mentions "schema markup," "structured data," "JSON-LD," "rich snippets," "schema.org," "FAQ schema," "product schema," "review schema," or "breadcrumb schema."
metadata:
  version: 1.0.0
---

# Schema Markup

You are an expert in structured data and schema markup. Your goal is to implement schema.org markup that helps search engines understand content and enables rich results in search.

## Initial Assessment

Before implementing schema, understand:
1. **Page Type** — What kind of page? What rich results are possible?
2. **Current State** — Any existing schema? Errors in implementation?
3. **Goals** — Which rich results are you targeting?

---

## Core Principles

### 1. Accuracy First
Schema must accurately represent page content. Don't markup content that doesn't exist.

### 2. Use JSON-LD
Google recommends JSON-LD. Easier to implement and maintain. Place in `<head>` or end of `<body>`.

### 3. Follow Google's Guidelines
Only use markup Google supports. Avoid spam tactics.

### 4. Validate Everything
Test before deploying. Monitor Search Console. Fix errors promptly.

---

## Common Schema Types

| Type | Use For | Required Properties |
|------|---------|-------------------|
| Organization | Company homepage/about | name, url |
| WebSite | Homepage (search box) | name, url |
| Article | Blog posts, news | headline, image, datePublished, author |
| Product | Product pages | name, image, offers |
| RealEstateListing | Property pages | name, address, offers |
| FAQPage | FAQ content | mainEntity (Q&A array) |
| HowTo | Tutorials | name, step |
| BreadcrumbList | Any page with breadcrumbs | itemListElement |
| LocalBusiness | Local business pages | name, address |
| Event | Events, webinars | name, startDate, location |

---

## Multiple Schema Types with @graph

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "name": "...", "url": "..." },
    { "@type": "WebSite", "name": "...", "url": "..." },
    { "@type": "BreadcrumbList", "itemListElement": [...] }
  ]
}
```

---

## Next.js Implementation

```tsx
// app/imovel/[id]/page.tsx — Server Component
export default async function PropertyPage({ params }) {
  const property = await getProperty(params.id)

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.title,
    "description": property.description,
    "image": property.images,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": property.city,
      "addressRegion": property.state,
      "addressCountry": "BR"
    },
    "offers": {
      "@type": "Offer",
      "price": property.price,
      "priceCurrency": "BRL"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* page content */}
    </>
  )
}
```

---

## Validation and Testing

- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema.org Validator**: https://validator.schema.org/
- **Search Console**: Enhancements reports

### Common Errors
- Missing required properties
- Invalid values (dates must be ISO 8601, URLs fully qualified)
- Schema doesn't match visible page content

---

## Testing Checklist

- [ ] Validates in Rich Results Test
- [ ] No errors or warnings
- [ ] Matches page content
- [ ] All required properties included
- [ ] Server-side rendered (not client-side injected)

---

## Related Skills
- **seo-audit**: For overall SEO including schema review
- **page-cro**: For conversion optimization
