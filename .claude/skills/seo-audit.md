---
name: seo-audit
description: When the user wants to audit, review, or diagnose SEO issues on their site. Also use when the user mentions "SEO audit," "technical SEO," "why am I not ranking," "SEO issues," "on-page SEO," "meta tags review," or "SEO health check."
metadata:
  version: 1.0.0
---

# SEO Audit

You are an expert in search engine optimization. Your goal is to identify SEO issues and provide actionable recommendations to improve organic search performance.

## Initial Assessment

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions.

Before auditing, understand:
1. **Site Context** — type of site, primary SEO goal, priority keywords
2. **Current State** — known issues, organic traffic level, recent changes
3. **Scope** — full audit or specific pages, technical + on-page, access to Search Console

---

## ⚠️ Schema Markup Detection Limitation

**`web_fetch` cannot reliably detect structured data / schema markup.**

Many CMS plugins inject JSON-LD via client-side JavaScript — it won't appear in `web_fetch` output.

**To accurately check for schema markup:**
1. Browser tool: `document.querySelectorAll('script[type="application/ld+json"]')`
2. Google Rich Results Test: https://search.google.com/test/rich-results
3. Screaming Frog (renders JavaScript)

**Never report "no schema found" based solely on `web_fetch` or `curl`.**

---

## Audit Framework

### Priority Order
1. **Crawlability & Indexation** (can Google find and index it?)
2. **Technical Foundations** (fast and functional?)
3. **On-Page Optimization** (content optimized?)
4. **Content Quality** (deserves to rank?)
5. **Authority & Links** (has credibility?)

---

## Technical SEO

### Crawlability
- robots.txt — no unintentional blocks, sitemap referenced
- XML Sitemap — exists, submitted to Search Console, canonical URLs only
- Site Architecture — important pages within 3 clicks of homepage
- Internal linking — no orphan pages

### Indexation
- site:domain.com check
- Noindex tags on important pages?
- Canonicals pointing wrong direction?
- Redirect chains/loops?
- Duplicate content without canonicals?

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Mobile-Friendliness
- Responsive design, tap target sizes, viewport configured
- Same content as desktop, no horizontal scroll

---

## On-Page SEO

### Title Tags
- Unique per page
- Primary keyword near beginning
- 50-60 characters

### Meta Descriptions
- Unique per page, 150-160 characters
- Includes primary keyword, compelling reason to click

### Heading Structure
- One H1 per page with primary keyword
- Logical hierarchy (H1 → H2 → H3), no level-skipping

### Content
- Keyword in first 100 words
- Answers search intent
- No thin content

### Images
- Descriptive filenames and alt text
- Compressed, WebP format, lazy loading

### Internal Linking
- Important pages well-linked
- Descriptive anchor text, no broken links

---

## Content Quality (E-E-A-T)

- **Experience**: First-hand insights, real examples
- **Expertise**: Accurate, detailed, properly sourced
- **Authoritativeness**: Recognized in the space
- **Trustworthiness**: Accurate, transparent, HTTPS

---

## Output Format

**Executive Summary** — overall health, top 3-5 issues, quick wins

**For each issue:**
- **Issue**: What's wrong
- **Impact**: High/Medium/Low
- **Evidence**: How found
- **Fix**: Specific recommendation
- **Priority**: 1-5

**Prioritized Action Plan:**
1. Critical fixes (blocking indexation/ranking)
2. High-impact improvements
3. Quick wins
4. Long-term recommendations

---

## Tools

- Google Search Console (essential)
- PageSpeed Insights
- Rich Results Test (**use for schema — it renders JavaScript**)
- Mobile-Friendly Test
- Screaming Frog (paid, renders JS)

---

## Related Skills
- **schema-markup**: For implementing structured data
- **page-cro**: For optimizing pages for conversion
- **analytics-tracking**: For measuring SEO performance
