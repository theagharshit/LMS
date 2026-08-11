import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fileStorageDB } from '../../src/db/fileStorageDB';
import { verifyFileIntegrity } from '../../src/middlewares/fileMiddleware';
import { prisma } from '../../src/db/services/prismaClient';
describe('API & Security Middleware Functional Workflows (tests/functional/api_and_middleware.test.ts)', () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: 'functional-file-uploader' },
      update: {},
      create: {
        id: 'functional-file-uploader',
        name: 'Functional File Uploader',
        email: 'functional.file.uploader@test.local',
        role: 'teacher',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
  });
  it('should store and query files in FileStorageDB', async () => {
    const record = await fileStorageDB.addFile({
      originalName: 'Functional_Test_Doc.pdf',
      storedName: '1785850099_Functional_Test_Doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      sizeFormatted: '2.00 KB',
      uploadedBy: 'Aarav Sharma',
      uploadedById: 'functional-file-uploader',
      classroomId: 'chan-1',
      checksum: 'sha256-func-test-12345',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/Functional_Test_Doc.pdf',
    });
    expect(record.id).toBeDefined();
    expect(record.originalName).toBe('Functional_Test_Doc.pdf');
    expect(record.integrityStatus).toBe('verified');
    const fetched = await fileStorageDB.getFileById(record.id);
    expect(fetched).toBeDefined();
    expect(fetched?.originalName).toBe('Functional_Test_Doc.pdf');
  });
  it('should list all stored file records from database', async () => {
    const files = await fileStorageDB.getAllFiles();
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
  it('should delete file record by ID from FileStorageDB', async () => {
    const tempRecord = await fileStorageDB.addFile({
      originalName: 'To_Be_Deleted.pdf',
      storedName: '1785850100_To_Be_Deleted.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      sizeFormatted: '100 B',
      uploadedBy: 'Mr. Ramesh Thapa',
      uploadedById: 'functional-file-uploader',
      classroomId: 'chan-1',
      checksum: 'sha256-delete-test',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/To_Be_Deleted.pdf',
    });
    const deleted = await fileStorageDB.deleteFile(tempRecord.id);
    expect(deleted).toBe(true);
    const check = await fileStorageDB.getFileById(tempRecord.id);
    expect(check).toBeNull();
  });
});
