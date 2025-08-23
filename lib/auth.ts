// lib/auth.ts

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

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
    console.error('[AUTH] ERRO: A variável de ambiente JWT_SECRET não está definida no backend.')
    return null
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const userFromDb = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, nome: true, email: true, role: true }, // Busca o campo 'nome'
    });

    if (!userFromDb) {
      console.log(`[AUTH] Token decodificado com sucesso para userId ${decoded.userId}, mas usuário não foi encontrado no banco.`);
      return null;
    }

    // CORREÇÃO AQUI: Mapeia 'nome' do banco para 'name' no objeto final
    const user: User = {
        id: userFromDb.id,
        name: userFromDb.nome,
        email: userFromDb.email,
        role: userFromDb.role
    };

    return user;

  } catch (error: any) {
    console.error('[AUTH] ERRO ao verificar o token JWT:', error.message);
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const userFromDb = await prisma.usuario.findUnique({
      where: { email },
    })

    if (!userFromDb || !userFromDb.passwordHash) {
      return null
    }

    const isValidPassword = await verifyPassword(password, userFromDb.passwordHash)

    if (!isValidPassword) {
      return null
    }

    // CORREÇÃO AQUI: Mapeia 'nome' do banco para 'name' no objeto final
    return {
      id: userFromDb.id,
      name: userFromDb.nome,
      email: userFromDb.email,
      role: userFromDb.role,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function getUserFromToken(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return verifyToken(token)
}
