import { neon } from "@neondatabase/serverless"

// Função para obter a conexão do banco
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined")
  }

  return neon(databaseUrl)
}

// Exportar uma instância padrão apenas se DATABASE_URL estiver disponível
export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null
