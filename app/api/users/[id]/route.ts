import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { type NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromToken(request);
        if (!user || user.role !== 'marketing_adm') {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }
        
        const body = await request.json();
        const { name, email, role, manager_id } = body;

        const updatedUser = await prisma.usuario.update({
            where: { id: params.id },
            data: {
                nome: name,
                email,
                role,
                superiorId: manager_id || null,
            }
        });
        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromToken(request);
        if (!user || user.role !== 'marketing_adm') {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }

        if (user.id === params.id) {
            return NextResponse.json({ error: "Você não pode excluir a si mesmo" }, { status: 400 });
        }

        await prisma.usuario.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: "Usuário excluído com sucesso" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
    }
}