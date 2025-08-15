import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from './db'

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const users = await sql`
      SELECT id, name, email, role
      FROM users 
      WHERE id = ${decoded.userId}
    `
    
    return users[0] || null
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users 
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const isValidPassword = await verifyPassword(password, user.password_hash)
    
    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function getUserFromToken(request: any): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}
