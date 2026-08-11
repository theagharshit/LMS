import { Prisma } from '@prisma/client';

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function withDeadlockRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const isDeadlock =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isDeadlock || attempt >= maxRetries) throw error;
      await wait(50 * 2 ** attempt + Math.floor(Math.random() * 25));
      attempt += 1;
    }
  }
}
