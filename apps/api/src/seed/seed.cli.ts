/**
 * Force reseed CLI (AC-17 / AC-30).
 *
 * Usage:
 *   pnpm --filter api seed -- --force
 *   SQLITE_PATH=... pnpm --filter api seed -- --force
 *
 * Without --force, seeds only when the employees table is empty.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function main(): Promise<void> {
  const force =
    process.argv.includes('--force') ||
    process.env.SEED_FORCE === 'true' ||
    process.env.SEED_FORCE === '1';

  // Avoid double-seed from OnModuleInit when CLI runs
  process.env.SEED_ON_BOOT = 'false';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seed = app.get(SeedService);
    const result = seed.seedIfEmpty(force);
    // eslint-disable-next-line no-console
    console.log(
      force
        ? `Force reseed done: ${JSON.stringify(result)}`
        : `Seed (if empty) done: ${JSON.stringify(result)}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
