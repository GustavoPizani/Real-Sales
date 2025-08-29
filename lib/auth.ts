// lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Interface para o objeto de usuário usado no frontend e no token
export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: UserPayload): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('A variável de ambiente JWT_SECRET não está definida.');
  }
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  if (!process.env.JWT_SECRET) {
    console.error('[AUTH] ERRO: A variável de ambiente JWT_SECRET não está definida no backend.');
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const userFromDb = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, nome: true, email: true, role: true },
    });

    if (!userFromDb) {
      console.log(`[AUTH] Token válido para userId ${decoded.userId}, mas usuário não foi encontrado.`);
      return null;
    }

    // Mapeia do schema (nome) para o payload do frontend (name)
    const user: UserPayload = {
        id: userFromDb.id,
        name: userFromDb.nome,
        email: userFromDb.email,
        role: userFromDb.role
    };

    return user;

  } catch (error: any) {
    console.error('[AUTH] ERRO ao verificar o token JWT:', error.message);
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<UserPayload | null> {
  try {
    const userFromDb = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!userFromDb || !userFromDb.passwordHash) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, userFromDb.passwordHash);

    if (!isValidPassword) {
      return null;
    }

    // Mapeia do schema (nome) para o payload do frontend (name)
    return {
      id: userFromDb.id,
      name: userFromDb.nome,
      email: userFromDb.email,
      role: userFromDb.role,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getUserFromToken(request: Request): Promise<UserPayload | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}