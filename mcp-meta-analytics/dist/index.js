import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
});
const server = new Server({ name: "meta-analytics", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_campaign_summary",
            description: "Retorna resumo agregado das campanhas do Meta Ads por período. Agrupa por campanha, ad set ou anúncio com totais de spend, leads, CPL médio e CTR. Use para ter uma visão geral da performance.",
            inputSchema: {
                type: "object",
                properties: {
                    start_date: {
                        type: "string",
                        description: "Data inicial no formato YYYY-MM-DD",
                    },
                    end_date: {
                        type: "string",
                        description: "Data final no formato YYYY-MM-DD",
                    },
                    group_by: {
                        type: "string",
                        enum: ["campaign", "ad_set", "ad"],
                        description: "Nível de agrupamento: campaign (padrão), ad_set ou ad",
                    },
                },
                required: ["start_date", "end_date"],
            },
        },
        {
            name: "get_top_campaigns",
            description: "Retorna as melhores ou piores campanhas rankeadas por uma métrica. Use para identificar o que performa melhor e o que precisa ser otimizado ou pausado.",
            inputSchema: {
                type: "object",
                properties: {
                    start_date: {
                        type: "string",
                        description: "Data inicial YYYY-MM-DD",
                    },
                    end_date: { type: "string", description: "Data final YYYY-MM-DD" },
                    metric: {
                        type: "string",
                        enum: ["leads", "cpl_asc", "cpl_desc", "ctr", "clicks", "spend"],
                        description: "Métrica para ranking: leads (mais leads), cpl_asc (menor CPL = melhor), cpl_desc (maior CPL = pior), ctr, clicks, spend",
                    },
                    top_n: {
                        type: "number",
                        description: "Quantas campanhas retornar (padrão 10)",
                    },
                },
                required: ["start_date", "end_date", "metric"],
            },
        },
        {
            name: "get_campaign_trend",
            description: "Retorna a evolução diária de métricas de uma campanha específica. Use para analisar oscilações de performance, identificar quedas ou picos e entender sazonalidade.",
            inputSchema: {
                type: "object",
                properties: {
                    campaign_name: {
                        type: "string",
                        description: "Nome da campanha (busca parcial, case-insensitive)",
                    },
                    start_date: {
                        type: "string",
                        description: "Data inicial YYYY-MM-DD",
                    },
                    end_date: { type: "string", description: "Data final YYYY-MM-DD" },
                },
                required: ["campaign_name", "start_date", "end_date"],
            },
        },
        {
            name: "get_overall_stats",
            description: "Retorna estatísticas consolidadas de todo o período: investimento total, leads gerados, CPL médio, CTR médio, alcance e número de campanhas ativas. Ponto de partida para qualquer análise.",
            inputSchema: {
                type: "object",
                properties: {
                    start_date: {
                        type: "string",
                        description: "Data inicial YYYY-MM-DD",
                    },
                    end_date: { type: "string", description: "Data final YYYY-MM-DD" },
                },
                required: ["start_date", "end_date"],
            },
        },
        {
            name: "get_campaign_metrics",
            description: "Consulta métricas brutas dia a dia de campanhas do Meta Ads. Use quando precisar de dados detalhados por data para análise específica ou exportação.",
            inputSchema: {
                type: "object",
                properties: {
                    start_date: {
                        type: "string",
                        description: "Data inicial YYYY-MM-DD",
                    },
                    end_date: { type: "string", description: "Data final YYYY-MM-DD" },
                    campaign_name: {
                        type: "string",
                        description: "Filtrar por nome de campanha (opcional, parcial)",
                    },
                    limit: {
                        type: "number",
                        description: "Máximo de registros retornados (padrão 100)",
                    },
                },
                required: ["start_date", "end_date"],
            },
        },
        {
            name: "compare_periods",
            description: "Compara métricas entre dois períodos de tempo (ex: esta semana vs semana passada, este mês vs mês anterior). Retorna variação percentual de cada métrica.",
            inputSchema: {
                type: "object",
                properties: {
                    period_a_start: {
                        type: "string",
                        description: "Início do período A (mais recente) YYYY-MM-DD",
                    },
                    period_a_end: {
                        type: "string",
                        description: "Fim do período A YYYY-MM-DD",
                    },
                    period_b_start: {
                        type: "string",
                        description: "Início do período B (anterior) YYYY-MM-DD",
                    },
                    period_b_end: {
                        type: "string",
                        description: "Fim do período B YYYY-MM-DD",
                    },
                    campaign_name: {
                        type: "string",
                        description: "Filtrar por campanha (opcional)",
                    },
                },
                required: [
                    "period_a_start",
                    "period_a_end",
                    "period_b_start",
                    "period_b_end",
                ],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "get_campaign_metrics") {
            const { start_date, end_date, campaign_name, limit = 100 } = args;
            const params = [start_date, end_date];
            let where = "WHERE date >= $1 AND date <= $2";
            if (campaign_name) {
                params.push(`%${campaign_name}%`);
                where += ` AND campaign_name ILIKE $${params.length}`;
            }
            params.push(limit);
            const query = `
        SELECT
          date, campaign_name, ad_set_name, ad_name, account_name,
          spend::numeric(10,2) as spend,
          impressions, clicks, leads, reach,
          cpl::numeric(10,2) as cpl,
          ctr::numeric(6,4) as ctr,
          cpc::numeric(10,2) as cpc,
          cpm::numeric(10,2) as cpm,
          link_clicks, unique_link_clicks
        FROM campaign_metrics
        ${where}
        ORDER BY date DESC, spend DESC
        LIMIT $${params.length}
      `;
            const result = await pool.query(query, params);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }
        if (name === "get_campaign_summary") {
            const { start_date, end_date, group_by = "campaign" } = args;
            const groupField = group_by === "ad"
                ? "ad_name"
                : group_by === "ad_set"
                    ? "ad_set_name"
                    : "campaign_name";
            const query = `
        SELECT
          ${groupField} as name,
          COUNT(DISTINCT date::text) as days_active,
          SUM(spend)::numeric(10,2) as total_spend,
          SUM(leads) as total_leads,
          SUM(clicks) as total_clicks,
          SUM(impressions) as total_impressions,
          SUM(reach) as total_reach,
          CASE WHEN SUM(leads) > 0
            THEN (SUM(spend) / SUM(leads))::numeric(10,2)
            ELSE NULL END as avg_cpl,
          CASE WHEN SUM(impressions) > 0
            THEN (SUM(clicks)::numeric / SUM(impressions) * 100)::numeric(6,2)
            ELSE 0 END as avg_ctr,
          CASE WHEN SUM(clicks) > 0
            THEN (SUM(spend) / SUM(clicks))::numeric(10,2)
            ELSE NULL END as avg_cpc,
          MIN(date) as first_date,
          MAX(date) as last_date
        FROM campaign_metrics
        WHERE date >= $1 AND date <= $2
          AND ${groupField} IS NOT NULL AND ${groupField} != ''
        GROUP BY ${groupField}
        ORDER BY total_spend DESC
      `;
            const result = await pool.query(query, [start_date, end_date]);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }
        if (name === "get_top_campaigns") {
            const { start_date, end_date, metric, top_n = 10 } = args;
            const orderMap = {
                leads: "total_leads DESC NULLS LAST",
                cpl_asc: "avg_cpl ASC NULLS LAST",
                cpl_desc: "avg_cpl DESC NULLS LAST",
                ctr: "avg_ctr DESC NULLS LAST",
                clicks: "total_clicks DESC NULLS LAST",
                spend: "total_spend DESC NULLS LAST",
            };
            const orderClause = orderMap[metric] ?? "total_spend DESC";
            const query = `
        SELECT
          campaign_name as name,
          SUM(spend)::numeric(10,2) as total_spend,
          SUM(leads) as total_leads,
          SUM(clicks) as total_clicks,
          SUM(impressions) as total_impressions,
          CASE WHEN SUM(leads) > 0
            THEN (SUM(spend) / SUM(leads))::numeric(10,2)
            ELSE NULL END as avg_cpl,
          CASE WHEN SUM(impressions) > 0
            THEN (SUM(clicks)::numeric / SUM(impressions) * 100)::numeric(6,2)
            ELSE 0 END as avg_ctr,
          COUNT(DISTINCT date::text) as days_active
        FROM campaign_metrics
        WHERE date >= $1 AND date <= $2
          AND campaign_name IS NOT NULL AND campaign_name != ''
        GROUP BY campaign_name
        HAVING SUM(spend) > 0 OR SUM(leads) > 0
        ORDER BY ${orderClause}
        LIMIT $3
      `;
            const result = await pool.query(query, [start_date, end_date, top_n]);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }
        if (name === "get_campaign_trend") {
            const { campaign_name, start_date, end_date } = args;
            const query = `
        SELECT
          date,
          SUM(spend)::numeric(10,2) as spend,
          SUM(leads) as leads,
          SUM(clicks) as clicks,
          SUM(impressions) as impressions,
          SUM(reach) as reach,
          CASE WHEN SUM(leads) > 0
            THEN (SUM(spend) / SUM(leads))::numeric(10,2)
            ELSE NULL END as cpl,
          CASE WHEN SUM(impressions) > 0
            THEN (SUM(clicks)::numeric / SUM(impressions) * 100)::numeric(6,2)
            ELSE 0 END as ctr
        FROM campaign_metrics
        WHERE date >= $1 AND date <= $2
          AND campaign_name ILIKE $3
        GROUP BY date
        ORDER BY date ASC
      `;
            const result = await pool.query(query, [
                start_date,
                end_date,
                `%${campaign_name}%`,
            ]);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
            };
        }
        if (name === "get_overall_stats") {
            const { start_date, end_date } = args;
            const query = `
        SELECT
          COUNT(DISTINCT campaign_name) as campaigns_count,
          COUNT(DISTINCT date::text) as days_with_data,
          SUM(spend)::numeric(10,2) as total_spend,
          SUM(leads) as total_leads,
          SUM(clicks) as total_clicks,
          SUM(impressions) as total_impressions,
          SUM(reach) as total_reach,
          CASE WHEN SUM(leads) > 0
            THEN (SUM(spend) / SUM(leads))::numeric(10,2)
            ELSE NULL END as overall_cpl,
          CASE WHEN SUM(impressions) > 0
            THEN (SUM(clicks)::numeric / SUM(impressions) * 100)::numeric(6,2)
            ELSE 0 END as overall_ctr,
          CASE WHEN SUM(clicks) > 0
            THEN (SUM(spend) / SUM(clicks))::numeric(10,2)
            ELSE NULL END as overall_cpc,
          MIN(date) as period_start,
          MAX(date) as period_end
        FROM campaign_metrics
        WHERE date >= $1 AND date <= $2
      `;
            const result = await pool.query(query, [start_date, end_date]);
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows[0], null, 2) }],
            };
        }
        if (name === "compare_periods") {
            const { period_a_start, period_a_end, period_b_start, period_b_end, campaign_name, } = args;
            const campaignFilter = campaign_name
                ? "AND campaign_name ILIKE $3"
                : "";
            const paramsA = campaign_name
                ? [period_a_start, period_a_end, `%${campaign_name}%`]
                : [period_a_start, period_a_end];
            const paramsB = campaign_name
                ? [period_b_start, period_b_end, `%${campaign_name}%`]
                : [period_b_start, period_b_end];
            const statsQuery = `
        SELECT
          SUM(spend)::numeric(10,2) as total_spend,
          SUM(leads) as total_leads,
          SUM(clicks) as total_clicks,
          SUM(impressions) as total_impressions,
          SUM(reach) as total_reach,
          CASE WHEN SUM(leads) > 0
            THEN (SUM(spend) / SUM(leads))::numeric(10,2)
            ELSE NULL END as avg_cpl,
          CASE WHEN SUM(impressions) > 0
            THEN (SUM(clicks)::numeric / SUM(impressions) * 100)::numeric(6,2)
            ELSE 0 END as avg_ctr
        FROM campaign_metrics
        WHERE date >= $1 AND date <= $2 ${campaignFilter}
      `;
            const [a, b] = await Promise.all([
                pool.query(statsQuery, paramsA),
                pool.query(statsQuery, paramsB),
            ]);
            const periodA = a.rows[0];
            const periodB = b.rows[0];
            const pct = (curr, prev) => {
                if (!prev || prev === 0)
                    return null;
                return Number((((curr ?? 0) - prev) / prev * 100).toFixed(2));
            };
            const comparison = {
                period_a: { start: period_a_start, end: period_a_end, ...periodA },
                period_b: { start: period_b_start, end: period_b_end, ...periodB },
                variation_pct: {
                    spend: pct(Number(periodA.total_spend), Number(periodB.total_spend)),
                    leads: pct(Number(periodA.total_leads), Number(periodB.total_leads)),
                    clicks: pct(Number(periodA.total_clicks), Number(periodB.total_clicks)),
                    cpl: pct(Number(periodA.avg_cpl), Number(periodB.avg_cpl)),
                    ctr: pct(Number(periodA.avg_ctr), Number(periodB.avg_ctr)),
                    reach: pct(Number(periodA.total_reach), Number(periodB.total_reach)),
                },
            };
            return {
                content: [
                    { type: "text", text: JSON.stringify(comparison, null, 2) },
                ],
            };
        }
        return {
            content: [{ type: "text", text: `Ferramenta não encontrada: ${name}` }],
            isError: true,
        };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Erro ao consultar banco: ${msg}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
