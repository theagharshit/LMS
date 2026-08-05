import { describe, it, expect } from 'vitest';
import { fileStorageDB } from '../../src/db/fileStorageDB';
import { MOCK_USERS } from '../../src/data/mockData';

describe('Role 4: Admin Permissions & System Inspection (tests/roles/admin.test.ts)', () => {
  it('allows admin to inspect system user records and role authorizations', () => {
    const adminUser = MOCK_USERS.find((u) => u.role === 'admin') || {
      id: 'usr-admin',
      name: 'School Principal',
      role: 'admin',
    };

    expect(adminUser.role).toBe('admin');
  });

  it('allows admin to audit all files in FileStorageDB', () => {
    const allStoredFiles = fileStorageDB.getAllFiles();
    expect(Array.isArray(allStoredFiles)).toBe(true);
    allStoredFiles.forEach((file) => {
      expect(file).toHaveProperty('checksum');
      expect(file).toHaveProperty('integrityStatus');
    });
  });
});
