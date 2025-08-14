import { neon } from "@neondatabase/serverless"

// Função que só executa em runtime, nunca durante build
export async function createDbConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or STORAGE_URL environment variable is required")
  }

  return neon(databaseUrl)
}

// Helper para executar queries de forma segura
export async function executeQuery(queryFn: (sql: any) => Promise<any>) {
  try {
    const sql = await createDbConnection()
    return await queryFn(sql)
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}
