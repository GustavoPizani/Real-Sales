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

export async function getUserFromToken(request: Request): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get("authorization")
    const cookieStore = cookies()

    let token: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    } else {
      token = cookieStore.get("auth-token")?.value || null
    }

    if (!token) {
      return null
    }

    return verifyToken(token)
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const users = await executeQuery("SELECT * FROM users WHERE email = $1", [email])

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

export async function createUser(userData: {
  name: string
  email: string
  password: string
  role: string
}): Promise<User | null> {
  try {
    const hashedPassword = await hashPassword(userData.password)

    const result = await executeQuery(
      `INSERT INTO users (name, email, password, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING id, name, email, role, created_at, updated_at`,
      [userData.name, userData.email, hashedPassword, userData.role],
    )

    return result[0] || null
  } catch (error) {
    console.error("Error creating user:", error)
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
