import { File, Paths, UploadType } from 'expo-file-system';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_MIME_TYPE = 'application/x-sqlite3';

export const MAX_BACKUPS = 5;

export type DriveBackupFile = {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
};

type RawDriveFile = {
  id: string;
  name?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
};

export class DriveError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

async function parseError(response: Response): Promise<DriveError> {
  let message = `Google Drive respondió con el código ${response.status}.`;

  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) message = body.error.message;
  } catch {
    // Keep the generic message when the body is not JSON.
  }

  return new DriveError(message, response.status);
}

function toBackupFile(file: RawDriveFile): DriveBackupFile {
  const createdAt = file.createdTime ?? file.modifiedTime ?? new Date().toISOString();

  return {
    id: file.id,
    name: file.name ?? 'Respaldo de Pyme App',
    size: Number(file.size ?? 0),
    createdAt,
    modifiedAt: file.modifiedTime ?? createdAt,
  };
}

/** Lists the backups stored in the app's hidden Drive folder, newest first. */
export async function listBackups(accessToken: string): Promise<DriveBackupFile[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,size,createdTime,modifiedTime)',
    orderBy: 'createdTime desc',
    pageSize: '50',
    q: 'trashed = false',
  });

  const response = await fetch(`${DRIVE_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw await parseError(response);

  const body = (await response.json()) as { files?: RawDriveFile[] };
  return (body.files ?? []).map(toBackupFile);
}

/**
 * Uploads a serialized SQLite database to the app's hidden Drive folder.
 * The native file upload is used because React Native's fetch does not send
 * binary request bodies reliably.
 */
export async function uploadBackup(
  accessToken: string,
  bytes: Uint8Array,
  name: string,
): Promise<DriveBackupFile> {
  const metadataResponse = await fetch(
    `${DRIVE_API}?fields=id,name,size,createdTime,modifiedTime`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: BACKUP_MIME_TYPE,
        parents: ['appDataFolder'],
      }),
    },
  );

  if (!metadataResponse.ok) throw await parseError(metadataResponse);
  const created = (await metadataResponse.json()) as RawDriveFile;

  const localFile = new File(Paths.cache, name);

  try {
    await localFile.write(bytes);

    const upload = await localFile.upload(
      `${DRIVE_UPLOAD_API}/${created.id}?uploadType=media&fields=id,name,size,createdTime,modifiedTime`,
      {
        httpMethod: 'PATCH',
        uploadType: UploadType.BINARY_CONTENT,
        mimeType: BACKUP_MIME_TYPE,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (upload.status < 200 || upload.status >= 300) {
      throw new DriveError(
        `No se pudo subir el respaldo (código ${upload.status}).`,
        upload.status,
      );
    }

    let uploaded: RawDriveFile | null = null;
    try {
      uploaded = JSON.parse(upload.body) as RawDriveFile;
    } catch {
      // Fall back to the metadata returned when the file was created.
    }

    return toBackupFile(uploaded ?? created);
  } catch (error) {
    // Do not leave an empty file behind if the media upload failed.
    try {
      await deleteBackup(accessToken, created.id);
    } catch {
      // Ignore cleanup errors.
    }
    throw error;
  } finally {
    try {
      if (localFile.exists) localFile.delete();
    } catch {
      // Ignore cleanup errors.
    }
  }
}

export async function downloadBackup(
  accessToken: string,
  fileId: string,
): Promise<Uint8Array> {
  const response = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw await parseError(response);

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function deleteBackup(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) throw await parseError(response);
}

/** Deletes older backups so only the newest `keep` files remain. */
export async function pruneBackups(accessToken: string, keep = MAX_BACKUPS): Promise<void> {
  const backups = await listBackups(accessToken);

  for (const file of backups.slice(keep)) {
    try {
      await deleteBackup(accessToken, file.id);
    } catch {
      // Pruning is best-effort; keep the newest backups even if one delete fails.
    }
  }
}
