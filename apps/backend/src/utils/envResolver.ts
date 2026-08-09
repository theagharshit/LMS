import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export function loadEnv() {
  const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
  let currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

  while (currentDir !== path.parse(currentDir).root) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  config({ path: path.resolve(process.cwd(), '.env') });
}
