import { NextResponse } from 'next/server';
import { getDriveClient, findOrCreateFolderForClient } from '@/lib/drive-helper';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const clientId = params.id;
        const drive = await getDriveClient();
        const folderId = await findOrCreateFolderForClient(drive, clientId);

        if (!folderId) {
            return NextResponse.json([]);
        }

        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink, iconLink)',
            spaces: 'drive',
        });

        return NextResponse.json(res.data.files || []);

    } catch (error: any) {
        console.error('Erro ao listar arquivos do Google Drive:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}

