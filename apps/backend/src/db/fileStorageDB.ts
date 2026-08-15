import { loadEnv } from '@utils/envResolver';

// Automatically finds and loads the root .env file
loadEnv();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { StoredFileRecord } from '@lms/shared';
import { logger } from '@utils/logger';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const toStoredFile = (record: any): StoredFileRecord => ({
  ...record,
  uploadedBy: record.uploader.name,
  sizeFormatted: formatBytes(record.sizeBytes),
});

/**
 * FileStorageDB Service (Async / Prisma-backed)
 *
 * Database service responsible for managing, indexing, and querying
 * stored file assets directly from PostgreSQL via Prisma ORM.
 */
class FileStorageDatabase {
  /**
   * Add a new file record to PostgreSQL database
   */
  public async addFile(
    record: Omit<StoredFileRecord, 'id' | 'uploadedAt'> & { uploadedById?: string },
  ): Promise<StoredFileRecord> {
    let validClassroomId = record.classroomId;
    if (validClassroomId) {
      const cls = await prisma.classroom.findUnique({ where: { id: validClassroomId } });
      if (!cls) throw new Error('The selected classroom does not exist.');
    }

    const uploader = record.uploadedById
      ? await prisma.user.findUnique({ where: { id: record.uploadedById } })
      : null;
    if (!uploader) throw new Error('Authenticated file uploader was not found.');
    if (validClassroomId) {
      const classroom = await prisma.classroom.findUnique({ where: { id: validClassroomId } });
      if (classroom?.schoolId !== uploader.schoolId)
        throw new Error('Files cannot be attached to a classroom in another school.');
    }
    const { uploadedBy: _uploadedBy, sizeFormatted: _sizeFormatted, ...storageRecord } = record;
    const newRecord = await prisma.storedFileRecord.create({
      data: {
        ...storageRecord,
        uploadedById: uploader.id,
        classroomId: validClassroomId,
        uploadedAt: new Date().toISOString(),
      },
      include: { uploader: true },
    });

    logger.info(
      `[FileStorageDB] Stored new file record in PostgreSQL: ${newRecord.originalName} (ID: ${newRecord.id})`,
    );
    return toStoredFile(newRecord);
  }

  /**
   * Fetch all file records stored in database
   */
  public async getAllFiles(classroomId?: string): Promise<StoredFileRecord[]> {
    const records = await prisma.storedFileRecord.findMany({
      where: classroomId ? { classroomId } : undefined,
      include: { uploader: true },
    });
    return records.map(toStoredFile);
  }

  /**
   * Fetch a single file by ID
   */
  public async getFileById(id: string): Promise<StoredFileRecord | null> {
    const record = await prisma.storedFileRecord.findUnique({
      where: { id },
      include: { uploader: true },
    });
    return record ? toStoredFile(record) : null;
  }

  /**
   * Delete a file record by ID
   */
  public async deleteFile(id: string): Promise<boolean> {
    try {
      await prisma.storedFileRecord.delete({
        where: { id },
      });
      logger.info(`[FileStorageDB] Deleted file record ID from PostgreSQL: ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search files by query string
   */
  public async searchFiles(query: string): Promise<StoredFileRecord[]> {
    const records = await prisma.storedFileRecord.findMany({
      where: {
        OR: [
          { originalName: { contains: query, mode: 'insensitive' } },
          { uploader: { name: { contains: query, mode: 'insensitive' } } },
          { checksum: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
    const hydrated = await prisma.storedFileRecord.findMany({
      where: { id: { in: records.map((record) => record.id) } },
      include: { uploader: true },
    });
    return hydrated.map(toStoredFile);
  }
}

export const fileStorageDB = new FileStorageDatabase();
