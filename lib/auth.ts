import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { executeQuery } from "./db"
import type { User, AuthUser } from "./types"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  )
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      name: decoded.name || "",
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const result = await executeQuery(async (sql) => {
      return await sql`
        SELECT id, name, email, password, role, created_at, updated_at
        FROM users 
        WHERE email = ${email} AND active = true
      `
    })

    if (!result || result.length === 0) {
      return null
    }

    const user = result[0]
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return null
    }

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    return verifyToken(token)
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export function clearAuthCookie() {
  const cookieStore = cookies()
  cookieStore.delete("auth-token")
}
