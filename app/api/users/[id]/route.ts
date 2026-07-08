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
        taskReminderMinutes: true,
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
        const { name, email, role, supervisorId, taskReminderMinutes } = body;

        const isAdmin = currentUser.role === Role.MARKETING_ADMIN;
        const isEditingSelf = currentUser.id === params.id;

        if (!isAdmin && !isEditingSelf) {
             return NextResponse.json({ error: "Sem permissão para editar este utilizador." }, { status: 403 });
        }

        const dataToUpdate: Prisma.UserUpdateInput = {};

        // A user can edit their own name, email and notification preferences
        if (isEditingSelf) {
            if (name) dataToUpdate.name = name;
            if (email) dataToUpdate.email = email;
            if (taskReminderMinutes !== undefined) {
                const mins = Number(taskReminderMinutes);
                if (!isNaN(mins) && mins >= 0) dataToUpdate.taskReminderMinutes = mins;
            }
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

        let transferToUserId: string | undefined;
        try {
            const body = await request.json();
            transferToUserId = body?.transferToUserId || undefined;
        } catch {
            // corpo vazio é aceitável (exclusão sem transferência)
        }

        const userToDelete = await prisma.user.findUnique({ where: { id: params.id }, select: { name: true } });
        if (!userToDelete) {
            return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
        }

        const clientWhere = { OR: [{ brokerId: params.id }, { createdById: params.id }] };
        const [clientCount, noteCount, taskCount, offerCreatedCount, offerAssignedCount, attendanceCount] = await Promise.all([
            prisma.client.count({ where: clientWhere }),
            prisma.note.count({ where: { authorId: params.id } }),
            prisma.task.count({ where: { userId: params.id } }),
            prisma.activeOffer.count({ where: { createdById: params.id } }),
            prisma.activeOfferClient.count({ where: { assignedToId: params.id } }),
            prisma.attendanceRecord.count({ where: { userId: params.id } }),
        ]);

        // Notas não bloqueiam a exclusão: o autor original fica preservado via authorName
        // (snapshot) e authorId vira null automaticamente (onDelete: SetNull).
        const requiresTransfer = clientCount + taskCount + offerCreatedCount + offerAssignedCount + attendanceCount > 0;

        if (requiresTransfer && !transferToUserId) {
            const clientFunnelGroups = await prisma.client.groupBy({
                by: ['funnelId'],
                where: clientWhere,
                _count: { _all: true },
            });
            const funnels = await prisma.funnel.findMany({
                where: { id: { in: clientFunnelGroups.map(g => g.funnelId) } },
                select: { id: true, name: true },
            });
            const clientsByFunnel = clientFunnelGroups.map(g => ({
                funnelId: g.funnelId,
                funnelName: funnels.find(f => f.id === g.funnelId)?.name || 'Funil desconhecido',
                count: g._count._all,
            }));

            return NextResponse.json(
                {
                    error: `Este utilizador possui ${clientCount} cliente(s), ${noteCount} nota(s), ${taskCount} tarefa(s) e outros registos associados. Selecione um corretor de destino para transferir tudo antes de excluir.`,
                    requiresTransfer: true,
                    clientCount,
                    noteCount,
                    taskCount,
                    clientsByFunnel,
                },
                { status: 409 }
            );
        }

        if (transferToUserId) {
            if (transferToUserId === params.id) {
                return NextResponse.json({ error: "O corretor de destino não pode ser o próprio utilizador a ser excluído." }, { status: 400 });
            }
            const targetUser = await prisma.user.findUnique({ where: { id: transferToUserId }, select: { id: true } });
            if (!targetUser) {
                return NextResponse.json({ error: "Corretor de destino inválido." }, { status: 400 });
            }

            await prisma.$transaction([
                prisma.client.updateMany({ where: { brokerId: params.id }, data: { brokerId: transferToUserId } }),
                prisma.client.updateMany({ where: { createdById: params.id }, data: { createdById: transferToUserId } }),
                prisma.client.updateMany({ where: { qualifiedForId: params.id }, data: { qualifiedForId: null } }),
                prisma.task.updateMany({ where: { userId: params.id }, data: { userId: transferToUserId } }),
                prisma.activeOffer.updateMany({ where: { createdById: params.id }, data: { createdById: transferToUserId } }),
                prisma.activeOfferClient.updateMany({ where: { assignedToId: params.id }, data: { assignedToId: transferToUserId } }),
                prisma.attendanceRecord.updateMany({ where: { userId: params.id }, data: { userId: transferToUserId } }),
                prisma.property.updateMany({ where: { creatorId: params.id }, data: { creatorId: null } }),
                prisma.property.updateMany({ where: { updaterId: params.id }, data: { updaterId: null } }),
                prisma.facebookFormMapping.updateMany({ where: { defaultBrokerId: params.id }, data: { defaultBrokerId: null } }),
                prisma.user.updateMany({ where: { supervisorId: params.id }, data: { supervisorId: null } }),
            ]);
        }

        // Preserva o nome do autor original das notas antes de o vínculo virar null (onDelete: SetNull),
        // para o front poder exibir o nome do utilizador excluído com risco em cima.
        if (noteCount > 0) {
            await prisma.note.updateMany({
                where: { authorId: params.id, authorName: null },
                data: { authorName: userToDelete.name },
            });
        }

        await prisma.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: "Utilizador removido com sucesso." });
    } catch (error: any) {
        console.error("Erro ao remover utilizador:", error);
        if (error.code === 'P2003') { // Foreign key constraint failed
             return NextResponse.json({ error: "Não é possível remover o utilizador pois ele é superior de outros utilizadores ou tem tarefas/notas/ofertas ativas associadas." }, { status: 409 });
        }
        return NextResponse.json({ error: "Erro interno ao remover utilizador" }, { status: 500 });
    }
}
