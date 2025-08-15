import { neon } from "@neondatabase/serverless"

let sql: any = null

function getDb() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined")
    }
    sql = neon(databaseUrl)
  }
  return sql
}

export async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  try {
    const db = getDb()
    const result = await db(query, params)
    return result
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await executeQuery("SELECT 1 as test")
    return result.length > 0
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}
