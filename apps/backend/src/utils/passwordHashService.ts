import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export const passwordHashService = {
  hash(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  },
};
