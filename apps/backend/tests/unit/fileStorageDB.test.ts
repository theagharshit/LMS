import { describe, it, expect, beforeAll } from 'vitest';
import { fileStorageDB } from '../../src/db/fileStorageDB';
import { prisma } from '../../src/db/services/prismaClient';
describe('FileStorageDB Engine (src/db/fileStorageDB.ts)', () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: 'file-test-uploader' },
      update: {},
      create: {
        id: 'file-test-uploader',
        name: 'File Test Uploader',
        email: 'file.uploader@test.local',
        role: 'teacher',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await fileStorageDB.addFile({
      originalName: 'Initial_Test_File.pdf',
      storedName: 'initial-test-file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512,
      sizeFormatted: '512 B',
      uploadedBy: 'File Test Uploader',
      uploadedById: 'file-test-uploader',
      checksum: 'sha256-initial-test-file',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/initial-test-file.pdf',
    });
  });
  it('should initialize with seed data records', async () => {
    const files = await fileStorageDB.getAllFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toHaveProperty('id');
    expect(files[0]).toHaveProperty('checksum');
    expect(files[0].integrityStatus).toBe('verified');
  });
  it('should store a new file record correctly', async () => {
    const newRecord = await fileStorageDB.addFile({
      originalName: 'Nepal_Curriculum_Math_G8.pdf',
      storedName: '1785850099_Math.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
      sizeFormatted: '1.00 MB',
      uploadedBy: 'Teacher Ramesh',
      uploadedById: 'file-test-uploader',
      classroomId: 'cls-math-8a',
      checksum: 'sha256-test1234567890abcdef',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/Nepal_Curriculum_Math_G8.pdf',
    });
    expect(newRecord).toHaveProperty('id');
    expect(newRecord.originalName).toBe('Nepal_Curriculum_Math_G8.pdf');
    const fetched = await fileStorageDB.getFileById(newRecord.id);
    expect(fetched).toBeDefined();
    expect(fetched?.uploadedBy).toBe('File Test Uploader');
  });
  it('should filter files by classroomId', async () => {
    const classroomFiles = await fileStorageDB.getAllFiles('cls-math-8a');
    expect(Array.isArray(classroomFiles)).toBe(true);
    classroomFiles.forEach((file) => {
      expect(file.classroomId).toBe('cls-math-8a');
    });
  });
  it('should search files by query keyword', async () => {
    const searchResults = await fileStorageDB.searchFiles('Math');
    expect(Array.isArray(searchResults)).toBe(true);
  });
  it('should delete a file record by ID', async () => {
    const record = await fileStorageDB.addFile({
      originalName: 'Temp_To_Delete.pdf',
      storedName: 'temp.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1000,
      sizeFormatted: '1 KB',
      uploadedBy: 'Tester',
      uploadedById: 'file-test-uploader',
      checksum: 'sha256-del',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/temp.pdf',
    });
    const deleted = await fileStorageDB.deleteFile(record.id);
    expect(deleted).toBe(true);
    const fetched = await fileStorageDB.getFileById(record.id);
    expect(fetched).toBeNull();
  });
});
