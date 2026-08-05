import { describe, it, expect } from 'vitest';
import { fileStorageDB } from '../../src/db/fileStorageDB';

describe('FileStorageDB Engine (src/db/fileStorageDB.ts)', () => {
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
      classroomId: 'chan-1',
      checksum: 'sha256-test1234567890abcdef',
      integrityStatus: 'verified',
      downloadUrl: '/uploads/Nepal_Curriculum_Math_G8.pdf',
    });

    expect(newRecord).toHaveProperty('id');
    expect(newRecord.originalName).toBe('Nepal_Curriculum_Math_G8.pdf');

    const fetched = await fileStorageDB.getFileById(newRecord.id);
    expect(fetched).toBeDefined();
    expect(fetched?.uploadedBy).toBe('Teacher Ramesh');
  });

  it('should filter files by classroomId', async () => {
    const classroomFiles = await fileStorageDB.getAllFiles('chan-1');
    expect(Array.isArray(classroomFiles)).toBe(true);
    classroomFiles.forEach((file) => {
      expect(file.classroomId).toBe('chan-1');
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
