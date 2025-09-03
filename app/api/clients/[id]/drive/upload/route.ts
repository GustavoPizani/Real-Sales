import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getDriveClient, findOrCreateFolderForClient } from '@/lib/drive-helper';
import { getUserFromToken } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const clientId = params.id;
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
        }

        const drive = await getDriveClient();
        const folderId = await findOrCreateFolderForClient(drive, clientId);

        const buffer = Buffer.from(await file.arrayBuffer());

        await drive.files.create({
            requestBody: { name: file.name, parents: [folderId] },
            media: { mimeType: file.type, body: Readable.from(buffer) },
            fields: 'id',
        });

        return NextResponse.json({ success: true, fileName: file.name });

    } catch (error: any) {
        console.error('Erro no upload para o Google Drive:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}

