import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken, hashPassword } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";

// GET: Busca um utilizador específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const loggedInUser = await getUserFromToken(request);
    if (!loggedInUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userToFind = await prisma.usuario.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        superiorId: true,
      },
    });

    if (!userToFind) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }
    
    // Mapeia para o formato esperado pelo frontend (name)
    const { nome, ...rest } = userToFind;
    const userForFrontend = { ...rest, name: nome };

    return NextResponse.json(userForFrontend);
  } catch (error) {
    console.error("Erro ao buscar utilizador:", error);
    return NextResponse.json({ error: "Erro interno ao buscar utilizador" }, { status: 500 });
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
        const { name, email, role, superiorId, password } = body;

        const isAdmin = currentUser.role === Role.marketing_adm;
        const isEditingSelf = currentUser.id === params.id;

        // Apenas um admin pode editar outros utilizadores. Utilizadores normais só se podem editar a si mesmos.
        if (!isAdmin && !isEditingSelf) {
             return NextResponse.json({ error: "Sem permissão para editar este utilizador." }, { status: 403 });
        }

        const dataToUpdate: Prisma.UsuarioUpdateInput = {};

        // Se o usuário está editando a si mesmo, ele só pode mudar o nome.
        if (isEditingSelf) {
            if (name) dataToUpdate.nome = name;
            if (email && email !== currentUser.email) {
                return NextResponse.json({ error: "Você não pode alterar seu próprio e-mail." }, { status: 403 });
            }
        }

        // Apenas admins podem mudar dados de outros usuários, cargo e superior.
        if (isAdmin) {
            if (name) dataToUpdate.nome = name;
            if (email) dataToUpdate.email = email;
            if (role) dataToUpdate.role = role;
            if (superiorId !== undefined) { // Permite definir superiorId como null
                dataToUpdate.superiorId = superiorId;
            }
        } else if (role || superiorId !== undefined) {
            // Utilizadores não-admin não podem alterar o seu próprio cargo ou superior
            return NextResponse.json({ error: "Sem permissão para alterar cargo ou superior." }, { status: 403 });
        }

        // Apenas admins podem redefinir a senha de outros utilizadores sem a senha antiga
        if (password && isAdmin && !isEditingSelf) {
            dataToUpdate.passwordHash = await hashPassword(password);
        } else if (password) {
            // A alteração de senha do próprio utilizador deve ser feita pelo endpoint /api/users/change-password
            return NextResponse.json({ error: "Para alterar a sua senha, use a aba de Segurança." }, { status: 400 });
        }

        const updatedUser = await prisma.usuario.update({
            where: { id: params.id },
            data: dataToUpdate,
        });
        
        const { passwordHash, nome, ...userWithoutSensitiveData } = updatedUser;

        return NextResponse.json({ user: { ...userWithoutSensitiveData, name: nome } });

    } catch (error: any) {
        console.error("Erro ao atualizar utilizador:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 400 });
        }
        return NextResponse.json({ error: "Erro interno ao atualizar utilizador" }, { status: 500 });
    }
}

// DELETE: Remove um utilizador
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const currentUser = await getUserFromToken(request);
        if (!currentUser || currentUser.role !== Role.marketing_adm) {
            return NextResponse.json({ error: "Sem permissão para remover utilizadores." }, { status: 403 });
        }
        
        if (currentUser.id === params.id) {
            return NextResponse.json({ error: "Não pode excluir a sua própria conta." }, { status: 400 });
        }

        await prisma.usuario.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Utilizador removido com sucesso." });
    } catch (error: any) {
        console.error("Erro ao remover utilizador:", error);
        if (error.code === 'P2003') { // Foreign key constraint failed
             return NextResponse.json({ error: "Não é possível remover o utilizador pois ele é superior de outros ou tem clientes/tarefas associadas." }, { status: 409 });
        }
        return NextResponse.json({ error: "Erro interno ao remover utilizador" }, { status: 500 });
    }
}
