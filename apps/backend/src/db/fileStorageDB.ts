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
    record: Omit<StoredFileRecord, 'id' | 'uploadedAt'>,
  ): Promise<StoredFileRecord> {
    const id = `file-db-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = await prisma.storedFileRecord.create({
      data: {
        ...record,
        id,
        uploadedAt: new Date().toISOString(),
      },
    });

    logger.info(
      `[FileStorageDB] Stored new file record in PostgreSQL: ${newRecord.originalName} (ID: ${id})`,
    );
    return newRecord as StoredFileRecord;
  }

  /**
   * Fetch all file records stored in database
   */
  public async getAllFiles(classroomId?: string): Promise<StoredFileRecord[]> {
    const records = await prisma.storedFileRecord.findMany({
      where: classroomId ? { classroomId } : undefined,
    });
    return records as StoredFileRecord[];
  }

  /**
   * Fetch a single file by ID
   */
  public async getFileById(id: string): Promise<StoredFileRecord | null> {
    const record = await prisma.storedFileRecord.findUnique({
      where: { id },
    });
    return record as StoredFileRecord | null;
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
          { uploadedBy: { contains: query, mode: 'insensitive' } },
          { checksum: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
    return records as StoredFileRecord[];
  }
}

export const fileStorageDB = new FileStorageDatabase();
