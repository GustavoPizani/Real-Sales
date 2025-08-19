// app/lib/auth.ts

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma' // Importa a instância única do Prisma
import { NextRequest } from 'next/server'

// A interface pode vir do seu types.ts ou ser definida aqui
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
  if (!process.env.JWT_SECRET) {
    throw new Error('A variável de ambiente JWT_SECRET não está definida.')
  }
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export async function verifyToken(token: string): Promise<User | null> {
  if (!process.env.JWT_SECRET) {
    console.error('A variável de ambiente JWT_SECRET não está definida.')
    return null
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any

    // Usando Prisma para buscar o usuário de forma segura
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    })

    return user
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    // Usando Prisma para buscar o usuário pelo email
    const user = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!user || !user.passwordHash) {
      return null // Usuário não encontrado ou não tem senha
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return null
    }

    // Retorna o usuário sem a senha
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

// Esta é a função que estava faltando no seu deploy!
export async function getUserFromToken(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}
