import { google } from 'googleapis';
import { prisma } from './prisma';

export async function getDriveClient() {
    const settings = await prisma.integrationSettings.findUnique({
        where: { serviceName: 'google_drive' },
    });

    if (!settings || !settings.accessToken) {
        throw new Error('Integração com Google Drive não configurada ou token de acesso ausente.');
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: settings.accessToken,
        refresh_token: settings.refreshToken,
    });

    // O cliente irá lidar com o refresh do token automaticamente se necessário

    return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function findOrCreateFolderForClient(drive: any, clientId: string): Promise<string> {
    const client = await prisma.cliente.findUnique({
        where: { id: clientId },
        include: { imovelDeInteresse: true },
    });

    if (!client) {
        throw new Error('Cliente não encontrado.');
    }

    const folderName = client.imovelDeInteresse
        ? `${client.nomeCompleto} - ${client.imovelDeInteresse.titulo}`
        : `${client.nomeCompleto} - Arquivos`;

    // Search for the folder
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    // If not found, create it
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });

    if (!folder.data.id) {
        throw new Error("Não foi possível criar a pasta no Google Drive.");
    }

    return folder.data.id;
}

