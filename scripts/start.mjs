import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting CredoFly Production Service...');

if (process.env.DATABASE_URL) {
  try {
    console.log('📦 Synchronizing PostgreSQL database schema...');
    execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database schema is up to date.');

    console.log('🌱 Checking and seeding initial flights and demo data...');
    execSync('npx tsx ./prisma/seed.ts', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database seeded successfully.');
  } catch (err) {
    console.warn('⚠️ Database sync/seed warning:', err.message);
  }
} else {
  console.warn('⚠️ DATABASE_URL not set in environment. Running without database auto-migration.');
}

console.log('✈️ Launching CredoFly server...');
await import('../server/dist/index.js');
