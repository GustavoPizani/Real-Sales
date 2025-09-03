import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

interface UserPayload {
  userId: string; // Garante que estamos esperando 'userId'
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('authToken')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;

    // Verificação crucial: o payload decodificado realmente tem um userId?
    if (!decoded || !decoded.userId) {
        console.error("Token decodificado não contém userId.");
        return null;
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, nome: true },
    });
    
    // Se a busca no banco de dados não retornar nada, o usuário não existe.
    if (!user) {
        console.warn(`Sessão válida para userId ${decoded.userId}, mas usuário não encontrado no banco de dados.`);
        return null;
    }

    return user;

  } catch (error) {
    console.error('Token inválido ou expirado durante a verificação:', error);
    return null;
  }
}