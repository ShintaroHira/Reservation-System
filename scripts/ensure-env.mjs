// Creates backend/.env and frontend/.env.local from their examples if missing.
// Existing files are never overwritten.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const [example, target] of [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.example', 'frontend/.env.local'],
]) {
  if (existsSync(join(root, target))) {
    console.log(`kept existing ${target}`);
  } else {
    copyFileSync(join(root, example), join(root, target));
    console.log(`created ${target} from ${example}`);
  }
}
