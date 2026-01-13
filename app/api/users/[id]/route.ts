import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// TODO: Replace getUserFromToken with Supabase auth helpers
import { getUserFromToken } from "@/lib/auth";
import { Prisma, Role } from "@prisma/client";

// GET: Fetches a specific user
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Replace with Supabase session logic
    const loggedInUser = await getUserFromToken(request);
    if (!loggedInUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        supervisorId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao buscar utilizador:", error);
    return NextResponse.json({ error: "Erro interno ao buscar utilizador" }, { status: 500 });
  }
}

// PATCH: Updates a user
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // TODO: Replace with Supabase session logic
        const currentUser = await getUserFromToken(request);
        if (!currentUser) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const body = await request.json();
        // Note: `password` update logic is removed as it will be handled by Supabase Auth.
        const { name, email, role, supervisorId } = body;

        const isAdmin = currentUser.role === Role.MARKETING_ADMIN;
        const isEditingSelf = currentUser.id === params.id;

        if (!isAdmin && !isEditingSelf) {
             return NextResponse.json({ error: "Sem permissão para editar este utilizador." }, { status: 403 });
        }

        const dataToUpdate: Prisma.UserUpdateInput = {};

        // A user can edit their own name and email
        if (isEditingSelf) {
            if (name) dataToUpdate.name = name;
            if (email) dataToUpdate.email = email; // Allowing self-email update
        }

        // Admins can update other users' data, role, and supervisor.
        if (isAdmin) {
            if (name) dataToUpdate.name = name;
            if (email) dataToUpdate.email = email;
            if (role) dataToUpdate.role = role;
            if (supervisorId !== undefined) { // Allows setting supervisorId to null
                dataToUpdate.supervisor = supervisorId ? { connect: { id: supervisorId } } : { disconnect: true };
            }
        } else if (role || supervisorId !== undefined) {
            // Non-admin users cannot change their own role or supervisor
            return NextResponse.json({ error: "Sem permissão para alterar cargo ou superior." }, { status: 403 });
        }

        // Password management is now handled by Supabase Auth.
        // Admin password resets should use the Supabase Admin API.
        // User password changes should use the Supabase client API on a dedicated page/component.

        const updatedUser = await prisma.user.update({
            where: { id: params.id },
            data: dataToUpdate,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                supervisorId: true,
            }
        });

        return NextResponse.json({ user: updatedUser });

    } catch (error: any) {
        console.error("Erro ao atualizar utilizador:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 400 });
        }
        return NextResponse.json({ error: "Erro interno ao atualizar utilizador" }, { status: 500 });
    }
}

// DELETE: Removes a user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // TODO: Replace with Supabase session logic
        const currentUser = await getUserFromToken(request);
        if (!currentUser || currentUser.role !== Role.MARKETING_ADMIN) {
            return NextResponse.json({ error: "Sem permissão para remover utilizadores." }, { status: 403 });
        }
        
        if (currentUser.id === params.id) {
            return NextResponse.json({ error: "Não pode excluir a sua própria conta." }, { status: 400 });
        }

        await prisma.user.delete({
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
