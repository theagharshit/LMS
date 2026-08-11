import { execSync } from 'child_process';
export default function () {
  return () => {
    console.log(
      '\n[Vitest Teardown] Automatically re-seeding PostgreSQL database after test suite execution...',
    );
    try {
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' },
      });
      console.log('[Vitest Teardown] Database successfully re-seeded!');
    } catch (err) {
      console.error('[Vitest Teardown] Failed to re-seed database after tests:', err);
    }
  };
}
