import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id",
};

// ─── Skill Resources ──────────────────────────────────────────────────────

const SKILLS: Record<string, { name: string; description: string; content: string }> = {
  "skill://copywriting": {
    name: "Copywriting Framework",
    description: "Framework completo para escrever copy de marketing que converte — headlines, CTAs, estrutura de página, princípios de clareza e benefícios.",
    content: `# Copywriting

You are an expert conversion copywriter. Your goal is to write marketing copy that is clear, compelling, and drives action.

## Copywriting Principles

### Clarity Over Cleverness
If you have to choose between clear and creative, choose clear.

### Benefits Over Features
Features: What it does. Benefits: What that means for the customer.

### Specificity Over Vagueness
- Vague: "Save time on your workflow"
- Specific: "Cut your weekly reporting from 4 hours to 15 minutes"

### Customer Language Over Company Language
Use words your customers use. Mirror voice-of-customer from reviews, interviews, support tickets.

## Writing Style Rules
1. Simple over complex — "Use" not "utilize"
2. Specific over vague — Avoid "streamline," "optimize," "innovative"
3. Active over passive — "We generate reports" not "Reports are generated"
4. Confident over qualified — Remove "almost," "very," "really"
5. Show over tell — Describe the outcome instead of using adverbs
6. Honest over sensational — Never fabricate statistics

## Page Structure Framework

### Above the Fold
**Headline formulas:**
- "{Achieve outcome} without {pain point}"
- "The {category} for {audience}"
- "Never {unpleasant event} again"
- "{Question highlighting main pain point}"

**Subheadline** — expands on headline, 1-2 sentences max

**Primary CTA** — "Start Free Trial" > "Sign Up"

### Core Sections
| Section | Purpose |
|---------|---------|
| Social Proof | Logos, stats, testimonials |
| Problem/Pain | Show you understand their situation |
| Solution/Benefits | Connect to outcomes (3-5 key benefits) |
| How It Works | 3-4 steps |
| Objection Handling | FAQ, guarantees |
| Final CTA | Recap value, repeat CTA |

## CTA Copy
**Weak:** Submit, Sign Up, Learn More, Click Here
**Strong:** Start Free Trial, Get [Specific Thing], See [Product] in Action

**Formula:** [Action Verb] + [What They Get] + [Qualifier if needed]

## Output Format
1. **Page Copy** — organized by section
2. **Annotations** — why each choice, which principle applied
3. **Alternatives** — 2-3 headline/CTA options with rationale`,
  },
  "skill://page-cro": {
    name: "Page CRO Framework",
    description: "Framework de Conversion Rate Optimization para analisar e melhorar páginas de marketing — homepage, landing pages, pricing, feature pages.",
    content: `# Page CRO (Conversion Rate Optimization)

Analyze pages across these dimensions, in order of impact:

## 1. Value Proposition Clarity (Highest Impact)
- Can a visitor understand what this is within 5 seconds?
- Is the primary benefit clear, specific, and differentiated?
- Written in customer's language (not company jargon)?

## 2. Headline Effectiveness
- Communicates core value proposition?
- Specific enough to be meaningful?
- Matches the traffic source's messaging?

**Strong patterns:**
- "Get [desired outcome] without [pain point]"
- Include numbers, timeframes, concrete details
- "Join 10,000+ teams who..."

## 3. CTA Placement and Copy
- One clear primary action?
- Visible without scrolling?
- Button copy communicates value?
  - Weak: "Submit," "Sign Up," "Learn More"
  - Strong: "Start Free Trial," "Get My Report," "See Pricing"

## 4. Visual Hierarchy
- Can someone scanning get the main message?
- Most important elements visually prominent?
- Enough white space?

## 5. Trust Signals
- Customer logos near CTAs
- Testimonials (specific, attributed, with photos)
- Case studies with real numbers
- Review scores

## 6. Objection Handling
Address: price/value, "will this work for me?", implementation difficulty, guarantees

## 7. Friction Points
- Too many form fields?
- Unclear next steps?
- Mobile experience issues?

## Output Format
1. **Quick Wins** — easy changes, immediate impact
2. **High-Impact Changes** — bigger effort, significant improvement
3. **Test Ideas** — hypotheses worth A/B testing
4. **Copy Alternatives** — 2-3 options for headlines/CTAs with rationale`,
  },
};

// ─── Tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_skill",
    description:
      "Retorna o framework completo de um skill de copywriting ou CRO para aplicar na tarefa atual. Use SEMPRE que o usuário pedir para escrever copy, melhorar texto, otimizar página ou criar anúncio.",
    inputSchema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          enum: ["copywriting", "page-cro"],
          description: "copywriting → framework completo para escrever copy de marketing. page-cro → framework de otimização de conversão de páginas.",
        },
      },
      required: ["skill"],
    },
  },
  {
    name: "get_overall_stats",
    description:
      "Retorna estatísticas consolidadas de todo o período: investimento total, leads gerados, CPL médio, CTR médio e número de campanhas ativas. Ponto de partida para qualquer análise.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final YYYY-MM-DD" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_campaign_summary",
    description:
      "Resumo agregado das campanhas por período. Agrupa por campanha, ad set ou anúncio com totais de spend, leads, CPL médio e CTR.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final YYYY-MM-DD" },
        group_by: {
          type: "string",
          enum: ["campaign", "ad_set", "ad"],
          description: "Nível de agrupamento (padrão: campaign)",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_top_campaigns",
    description:
      "Campanhas rankeadas por uma métrica. Use metric=cpl_asc para as melhores (menor CPL), cpl_desc para as piores.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final YYYY-MM-DD" },
        metric: {
          type: "string",
          enum: ["leads", "cpl_asc", "cpl_desc", "ctr", "clicks", "spend"],
        },
        top_n: { type: "number", description: "Quantidade (padrão 10)" },
      },
      required: ["start_date", "end_date", "metric"],
    },
  },
  {
    name: "get_campaign_trend",
    description:
      "Evolução diária de uma campanha específica. Use para analisar oscilações e tendências.",
    inputSchema: {
      type: "object",
      properties: {
        campaign_name: { type: "string", description: "Nome parcial da campanha" },
        start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final YYYY-MM-DD" },
      },
      required: ["campaign_name", "start_date", "end_date"],
    },
  },
  {
    name: "compare_periods",
    description:
      "Compara métricas entre dois períodos. Retorna variação percentual de spend, leads, CPL, CTR e reach.",
    inputSchema: {
      type: "object",
      properties: {
        period_a_start: { type: "string" },
        period_a_end: { type: "string" },
        period_b_start: { type: "string" },
        period_b_end: { type: "string" },
        campaign_name: { type: "string", description: "Filtrar por campanha (opcional)" },
      },
      required: ["period_a_start", "period_a_end", "period_b_start", "period_b_end"],
    },
  },
  {
    name: "get_campaign_metrics",
    description:
      "Dados brutos dia a dia de campanhas. Use para exportar dados ou análise específica por data.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string" },
        end_date: { type: "string" },
        campaign_name: { type: "string", description: "Filtrar por campanha (opcional)" },
        limit: { type: "number", description: "Máximo de registros (padrão 100)" },
      },
      required: ["start_date", "end_date"],
    },
  },
];

// ─── Tool handlers ─────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

async function handleTool(name: string, args: ToolArgs) {
  if (name === "get_skill") {
    const { skill } = args as { skill: string };
    const resource = SKILLS[`skill://${skill}`];
    if (!resource) throw new Error(`Skill não encontrado: ${skill}`);
    return { content: [{ type: "text", text: resource.content }] };
  }

  if (name === "get_overall_stats") {
    const { start_date, end_date } = args as { start_date: string; end_date: string };
    const rows = await prisma.$queryRaw<unknown[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT campaign_name)::int AS campaigns_count,
        COUNT(DISTINCT date::text)::int AS days_with_data,
        ROUND(SUM(spend)::numeric, 2) AS total_spend,
        SUM(leads)::int AS total_leads,
        SUM(clicks)::int AS total_clicks,
        SUM(impressions)::int AS total_impressions,
        SUM(reach)::int AS total_reach,
        CASE WHEN SUM(leads) > 0
          THEN ROUND((SUM(spend) / SUM(leads))::numeric, 2)
          ELSE NULL END AS overall_cpl,
        CASE WHEN SUM(impressions) > 0
          THEN ROUND((SUM(clicks)::numeric / SUM(impressions) * 100)::numeric, 4)
          ELSE 0 END AS overall_ctr,
        MIN(date) AS period_start,
        MAX(date) AS period_end
      FROM campaign_metrics
      WHERE date >= ${start_date}::date AND date <= ${end_date}::date
    `);
    return { content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }] };
  }

  if (name === "get_campaign_summary") {
    const { start_date, end_date, group_by = "campaign" } = args as {
      start_date: string;
      end_date: string;
      group_by?: string;
    };
    const field =
      group_by === "ad" ? "ad_name" : group_by === "ad_set" ? "ad_set_name" : "campaign_name";

    const rows = await prisma.$queryRawUnsafe<unknown[]>(`
      SELECT
        ${field} AS name,
        COUNT(DISTINCT date::text)::int AS days_active,
        ROUND(SUM(spend)::numeric, 2) AS total_spend,
        SUM(leads)::int AS total_leads,
        SUM(clicks)::int AS total_clicks,
        SUM(impressions)::int AS total_impressions,
        SUM(reach)::int AS total_reach,
        CASE WHEN SUM(leads) > 0
          THEN ROUND((SUM(spend) / SUM(leads))::numeric, 2)
          ELSE NULL END AS avg_cpl,
        CASE WHEN SUM(impressions) > 0
          THEN ROUND((SUM(clicks)::numeric / SUM(impressions) * 100)::numeric, 4)
          ELSE 0 END AS avg_ctr,
        MIN(date) AS first_date,
        MAX(date) AS last_date
      FROM campaign_metrics
      WHERE date >= '${start_date}'::date AND date <= '${end_date}'::date
        AND ${field} IS NOT NULL AND ${field} != ''
      GROUP BY ${field}
      ORDER BY total_spend DESC
    `);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === "get_top_campaigns") {
    const { start_date, end_date, metric, top_n = 10 } = args as {
      start_date: string;
      end_date: string;
      metric: string;
      top_n?: number;
    };
    const orderMap: Record<string, string> = {
      leads: "total_leads DESC NULLS LAST",
      cpl_asc: "avg_cpl ASC NULLS LAST",
      cpl_desc: "avg_cpl DESC NULLS LAST",
      ctr: "avg_ctr DESC NULLS LAST",
      clicks: "total_clicks DESC NULLS LAST",
      spend: "total_spend DESC NULLS LAST",
    };
    const orderClause = orderMap[metric] ?? "total_spend DESC";

    const rows = await prisma.$queryRawUnsafe<unknown[]>(`
      SELECT
        campaign_name AS name,
        ROUND(SUM(spend)::numeric, 2) AS total_spend,
        SUM(leads)::int AS total_leads,
        SUM(clicks)::int AS total_clicks,
        CASE WHEN SUM(leads) > 0
          THEN ROUND((SUM(spend) / SUM(leads))::numeric, 2)
          ELSE NULL END AS avg_cpl,
        CASE WHEN SUM(impressions) > 0
          THEN ROUND((SUM(clicks)::numeric / SUM(impressions) * 100)::numeric, 4)
          ELSE 0 END AS avg_ctr,
        COUNT(DISTINCT date::text)::int AS days_active
      FROM campaign_metrics
      WHERE date >= '${start_date}'::date AND date <= '${end_date}'::date
        AND campaign_name IS NOT NULL AND campaign_name != ''
      GROUP BY campaign_name
      HAVING SUM(spend) > 0 OR SUM(leads) > 0
      ORDER BY ${orderClause}
      LIMIT ${Number(top_n)}
    `);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === "get_campaign_trend") {
    const { campaign_name, start_date, end_date } = args as {
      campaign_name: string;
      start_date: string;
      end_date: string;
    };
    const rows = await prisma.$queryRaw<unknown[]>(Prisma.sql`
      SELECT
        date,
        ROUND(SUM(spend)::numeric, 2) AS spend,
        SUM(leads)::int AS leads,
        SUM(clicks)::int AS clicks,
        SUM(impressions)::int AS impressions,
        CASE WHEN SUM(leads) > 0
          THEN ROUND((SUM(spend) / SUM(leads))::numeric, 2)
          ELSE NULL END AS cpl,
        CASE WHEN SUM(impressions) > 0
          THEN ROUND((SUM(clicks)::numeric / SUM(impressions) * 100)::numeric, 4)
          ELSE 0 END AS ctr
      FROM campaign_metrics
      WHERE date >= ${start_date}::date AND date <= ${end_date}::date
        AND campaign_name ILIKE ${`%${campaign_name}%`}
      GROUP BY date
      ORDER BY date ASC
    `);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }

  if (name === "compare_periods") {
    const { period_a_start, period_a_end, period_b_start, period_b_end, campaign_name } = args as {
      period_a_start: string;
      period_a_end: string;
      period_b_start: string;
      period_b_end: string;
      campaign_name?: string;
    };
    const campaignFilter = campaign_name ? `AND campaign_name ILIKE '%${campaign_name}%'` : "";

    const queryStats = (start: string, end: string) =>
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
        SELECT
          ROUND(SUM(spend)::numeric, 2) AS total_spend,
          SUM(leads)::int AS total_leads,
          SUM(clicks)::int AS total_clicks,
          SUM(impressions)::int AS total_impressions,
          SUM(reach)::int AS total_reach,
          CASE WHEN SUM(leads) > 0
            THEN ROUND((SUM(spend) / SUM(leads))::numeric, 2)
            ELSE NULL END AS avg_cpl,
          CASE WHEN SUM(impressions) > 0
            THEN ROUND((SUM(clicks)::numeric / SUM(impressions) * 100)::numeric, 4)
            ELSE 0 END AS avg_ctr
        FROM campaign_metrics
        WHERE date >= '${start}'::date AND date <= '${end}'::date ${campaignFilter}
      `);

    const [rowsA, rowsB] = await Promise.all([
      queryStats(period_a_start, period_a_end),
      queryStats(period_b_start, period_b_end),
    ]);

    const a = rowsA[0];
    const b = rowsB[0];
    const pct = (curr: unknown, prev: unknown): number | null => {
      const c = Number(curr);
      const p = Number(prev);
      if (!p) return null;
      return Number(((c - p) / p * 100).toFixed(2));
    };

    const result = {
      period_a: { start: period_a_start, end: period_a_end, ...a },
      period_b: { start: period_b_start, end: period_b_end, ...b },
      variation_pct: {
        spend: pct(a.total_spend, b.total_spend),
        leads: pct(a.total_leads, b.total_leads),
        clicks: pct(a.total_clicks, b.total_clicks),
        cpl: pct(a.avg_cpl, b.avg_cpl),
        ctr: pct(a.avg_ctr, b.avg_ctr),
        reach: pct(a.total_reach, b.total_reach),
      },
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  if (name === "get_campaign_metrics") {
    const { start_date, end_date, campaign_name, limit = 100 } = args as {
      start_date: string;
      end_date: string;
      campaign_name?: string;
      limit?: number;
    };
    const campaignFilter = campaign_name ? `AND campaign_name ILIKE '%${campaign_name}%'` : "";

    const rows = await prisma.$queryRawUnsafe<unknown[]>(`
      SELECT
        date, campaign_name, ad_set_name, ad_name, account_name,
        ROUND(spend::numeric, 2) AS spend,
        impressions, clicks, leads, reach,
        ROUND(cpl::numeric, 2) AS cpl,
        ROUND(ctr::numeric, 4) AS ctr,
        ROUND(cpc::numeric, 2) AS cpc,
        link_clicks
      FROM campaign_metrics
      WHERE date >= '${start_date}'::date AND date <= '${end_date}'::date
        ${campaignFilter}
      ORDER BY date DESC, spend DESC
      LIMIT ${Number(limit)}
    `);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }

  throw new Error(`Tool not found: ${name}`);
}

// ─── Route handlers ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, name: "meta-analytics", version: "1.0.0", tools: TOOLS.length },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  // Optional API key auth
  const apiKey = process.env.MCP_API_KEY;
  if (apiKey) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: corsHeaders }
    );
  }

  const msg = body as { jsonrpc: string; id?: unknown; method: string; params?: unknown };
  const { id, method, params } = msg;

  try {
    let result: unknown;

    if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "meta-analytics", version: "1.0.0" },
      };
    } else if (method === "ping") {
      result = {};
    } else if (method === "tools/list") {
      result = { tools: TOOLS };
    } else if (method === "tools/call") {
      const { name, arguments: toolArgs } = params as { name: string; arguments: ToolArgs };
      result = await handleTool(name, toolArgs ?? {});
    } else if (method === "resources/list") {
      result = {
        resources: Object.entries(SKILLS).map(([uri, skill]) => ({
          uri,
          name: skill.name,
          description: skill.description,
          mimeType: "text/markdown",
        })),
      };
    } else if (method === "resources/read") {
      const { uri } = params as { uri: string };
      const skill = SKILLS[uri];
      if (!skill) throw new Error(`Resource not found: ${uri}`);
      result = {
        contents: [{ uri, mimeType: "text/markdown", text: skill.content }],
      };
    } else if (method?.startsWith("notifications/")) {
      // Notifications don't get a response
      return new NextResponse(null, { status: 202, headers: corsHeaders });
    } else {
      return NextResponse.json(
        { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32603, message } },
      { status: 500, headers: corsHeaders }
    );
  }
}
