// app/api/users/[id]/route.ts

import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";

// GET: Busca um utilizador específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userToFind = await prisma.user.findUnique({
      where: { id: params.id },
      include: { superior: true },
    });

    if (!userToFind) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    return NextResponse.json(userToFind);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH: Atualiza um utilizador
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const currentUser = await getUserFromToken(request);
        if (!currentUser) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, role, manager_id, currentPassword, newPassword } = body;

        // Apenas admins podem mudar o cargo e o gestor de outros
        if ((role || manager_id) && currentUser.role !== Role.marketing_adm) {
            return NextResponse.json({ error: "Sem permissão para alterar cargo ou gestor." }, { status: 403 });
        }

        const dataToUpdate: Prisma.UserUpdateInput = {};

        if (name) dataToUpdate.name = name;
        if (email) dataToUpdate.email = email;
        if (role) dataToUpdate.role = role;
        if (manager_id) dataToUpdate.superior = { connect: { id: manager_id } };

        // Lógica para atualização de senha
        if (newPassword && currentPassword) {
            const userToUpdate = await prisma.user.findUnique({ where: { id: params.id } });
            if (!userToUpdate?.passwordHash) {
                return NextResponse.json({ error: "Utilizador não tem uma senha definida." }, { status: 400 });
            }
            const isPasswordValid = await bcrypt.compare(currentPassword, userToUpdate.passwordHash);
            if (!isPasswordValid) {
                return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
            }
            dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 12);
        }

        const updatedUser = await prisma.user.update({
            where: { id: params.id },
            data: dataToUpdate,
        });

        return NextResponse.json({ user: updatedUser });

    } catch (error) {
        console.error("Erro ao atualizar utilizador:", error);
        return NextResponse.json({ error: "Erro interno ao atualizar utilizador" }, { status: 500 });
    }
}

// DELETE: Remove um utilizador
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const currentUser = await getUserFromToken(request);
        if (!currentUser || currentUser.role !== Role.marketing_adm) {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }
        
        if (currentUser.id === params.id) {
            return NextResponse.json({ error: "Não pode excluir a sua própria conta." }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Utilizador removido com sucesso." });
    } catch (error) {
        console.error("Erro ao remover utilizador:", error);
        return NextResponse.json({ error: "Erro interno ao remover utilizador" }, { status: 500 });
    }
}
