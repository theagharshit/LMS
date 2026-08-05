import { describe, it, expect, vi } from 'vitest';
import { fileStorageDB } from '../../src/db/fileStorageDB';
import { verifyFileIntegrity } from '../../src/middlewares/fileMiddleware';

describe('API & Security Middleware Functional Workflows (tests/functional/api_and_middleware.test.ts)', () => {
  it('should store and query files in FileStorageDB', () => {
    const record = fileStorageDB.addFile({
      originalName: 'Functional_Test_Doc.pdf',
      storedName: '1785850099_Functional_Test_Doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      sizeFormatted: '2.00 KB',
      uploadedBy: 'Aarav Sharma',
      classroomId: 'chan-1',
      checksum: 'sha256-func-test-12345',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/Functional_Test_Doc.pdf',
    });

    expect(record.id).toBeDefined();
    expect(record.originalName).toBe('Functional_Test_Doc.pdf');
    expect(record.integrityStatus).toBe('verified');

    const fetched = fileStorageDB.getFileById(record.id);
    expect(fetched).toBeDefined();
    expect(fetched?.originalName).toBe('Functional_Test_Doc.pdf');
  });

  it('should list all stored file records from database', () => {
    const files = fileStorageDB.getAllFiles();
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should execute verifyFileIntegrity middleware successfully', () => {
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    verifyFileIntegrity(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should delete file record by ID from FileStorageDB', () => {
    const tempRecord = fileStorageDB.addFile({
      originalName: 'To_Be_Deleted.pdf',
      storedName: '1785850100_To_Be_Deleted.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      sizeFormatted: '100 B',
      uploadedBy: 'Mr. Ramesh Thapa',
      classroomId: 'chan-1',
      checksum: 'sha256-delete-test',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/To_Be_Deleted.pdf',
    });

    const deleted = fileStorageDB.deleteFile(tempRecord.id);
    expect(deleted).toBe(true);

    const check = fileStorageDB.getFileById(tempRecord.id);
    expect(check).toBeUndefined();
  });
});
