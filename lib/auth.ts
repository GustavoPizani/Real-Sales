import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { sql } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret"

export interface User {
  id: number
  name: string
  email: string
  role: string
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const users = await sql`
      SELECT id, name, email, password, role 
      FROM users 
      WHERE email = ${email} AND active = true
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

export async function getUserFromToken(request: Request): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return null

    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)

    if (!decoded) return null

    const users = await sql`
      SELECT id, name, email, role 
      FROM users 
      WHERE id = ${decoded.userId} AND active = true
    `

    return users.length > 0 ? users[0] : null
  } catch (error) {
    return null
  }
}
