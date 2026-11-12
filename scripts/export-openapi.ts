import 'tsconfig-paths/register';
import '../src/config/load-env';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/swagger';

const FILE = resolve(__dirname, '..', 'openapi.json');

async function main() {
  const check = process.argv.includes('--check');
  // preview: the module graph is read, nothing is instantiated (no database, no Redis).
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  const json = JSON.stringify(buildOpenApiDocument(app), null, 2) + '\n';
  await app.close();

  if (check) {
    let current = '';
    try {
      current = readFileSync(FILE, 'utf8');
    } catch {
      // a missing file counts as stale
    }
    if (current !== json) {
      console.error(
        'openapi.json is stale: run `pnpm swagger:export` and commit it.',
      );
      process.exit(1);
    }
    console.log('openapi.json is up to date.');
    return;
  }

  writeFileSync(FILE, json);
  console.log(`Wrote ${FILE}`);
}

void main();
