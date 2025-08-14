// Script to copy _worker.js to dist after build
import { copyFileSync } from 'fs';
import { join } from 'path';

try {
  copyFileSync(
    join(process.cwd(), 'public', '_worker.js'),
    join(process.cwd(), 'dist', '_worker.js')
  );
  console.log('✅ _worker.js copied to dist/');
} catch (error) {
  console.error('Error copying _worker.js:', error);
}
