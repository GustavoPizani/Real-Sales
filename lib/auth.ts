import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDb } from "./db"
import type { User } from "./types"

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production"

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const sql = getDb()

    const users = await sql`
      SELECT id, name, email, password, role, created_at
      FROM users 
      WHERE email = ${email}
      LIMIT 1
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  )
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
