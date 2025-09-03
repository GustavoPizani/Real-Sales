// lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// Interface para o objeto de usuário usado no frontend e no token
export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Interface para o payload decodificado do JWT
interface JwtPayload {
  userId: string;
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

export async function verifyToken(token: string | undefined): Promise<UserPayload | null> {
  if (!token) {
    console.log('[AUTH] Tentativa de verificação sem token.');
    return null;
  }
  if (!process.env.JWT_SECRET) {
    console.error('[AUTH] ERRO: A variável de ambiente JWT_SECRET não está definida no backend.');
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    
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
    console.error(`[AUTH] ERRO ao verificar o token JWT: ${error.name} - ${error.message}`);
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

export async function getUserFromToken(token: string | undefined): Promise<UserPayload | null> {
  // Esta função agora recebe o token diretamente.
  // A lógica de extrair o token do cabeçalho ou cookie foi movida
  // para as rotas da API, que é o local correto.
  return verifyToken(token);
}