import { StoredFileRecord } from '../types';
import { logger } from '../utils/logger';

/**
 * FileStorageDB Service
 * 
 * Dedicated storage database engine for managing, indexing, and querying 
 * all file assets across the Sikshya LMS system.
 */
class FileStorageDatabase {
  private db: Map<string, StoredFileRecord> = new Map();

  constructor() {
    this.seedDatabase();
  }

  /**
   * Seed initial storage database entries
   */
  private seedDatabase() {
    const initialFiles: StoredFileRecord[] = [
      {
        id: 'file-db-101',
        originalName: 'Grade_8_Math_Pythagoras_Theorem.pdf',
        storedName: '1785850000_Pythagoras_Theorem.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1548576,
        sizeFormatted: '1.48 MB',
        uploadedBy: 'Ramesh Thapa',
        classroomId: 'chan-1',
        checksum: 'sha256-a9f8b4c2e1d7532098471abcfe094857',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        downloadUrl: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf'
      },
      {
        id: 'file-db-102',
        originalName: 'Science_Lab_Experiment_Guide.pdf',
        storedName: '1785850001_Science_Lab_Guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2411724,
        sizeFormatted: '2.30 MB',
        uploadedBy: 'Saraswati Gurung',
        classroomId: 'chan-2',
        checksum: 'sha256-b7e3f1a098c4321156890defab123456',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 43200000).toISOString(),
        downloadUrl: '/uploads/Science_Lab_Experiment_Guide.pdf'
      }
    ];

    initialFiles.forEach(file => this.db.set(file.id, file));
    logger.info(`FileStorageDB initialized with ${this.db.size} records`);
  }

  /**
   * Add a new file record to the database
   */
  public addFile(record: Omit<StoredFileRecord, 'id' | 'uploadedAt'>): StoredFileRecord {
    const id = `file-db-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord: StoredFileRecord = {
      ...record,
      id,
      uploadedAt: new Date().toISOString()
    };

    this.db.set(id, newRecord);
    logger.info(`[FileStorageDB] Stored new file record: ${newRecord.originalName} (ID: ${id})`);
    return newRecord;
  }

  /**
   * Fetch all file records stored in database
   */
  public getAllFiles(classroomId?: string): StoredFileRecord[] {
    const records = Array.from(this.db.values());
    if (classroomId) {
      return records.filter(f => f.classroomId === classroomId);
    }
    return records;
  }

  /**
   * Fetch a single file by ID
   */
  public getFileById(id: string): StoredFileRecord | undefined {
    return this.db.get(id);
  }

  /**
   * Delete a file record by ID
   */
  public deleteFile(id: string): boolean {
    const exists = this.db.has(id);
    if (exists) {
      this.db.delete(id);
      logger.info(`[FileStorageDB] Deleted file record ID: ${id}`);
    }
    return exists;
  }

  /**
   * Search files by query string
   */
  public searchFiles(query: string): StoredFileRecord[] {
    const q = query.toLowerCase();
    return Array.from(this.db.values()).filter(
      f => f.originalName.toLowerCase().includes(q) || 
           f.uploadedBy.toLowerCase().includes(q) ||
           f.checksum.toLowerCase().includes(q)
    );
  }
}

export const fileStorageDB = new FileStorageDatabase();
