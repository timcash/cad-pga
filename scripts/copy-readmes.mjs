import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const workspaceRoot = process.cwd();
const distRoot = join(workspaceRoot, 'dist');

const markdownFiles = [
  'README.md',
  'mesh-cleanup/README.md',
  'cnc-kernel-simulator/README.md',
  'look-ma-no-matrices/README.md',
  'gear-rotation-linkage/README.md',
  'meshless-fea-wos/README.md'
];

for (const relativePath of markdownFiles) {
  const sourcePath = join(workspaceRoot, relativePath);
  const destinationPath = join(distRoot, relativePath);

  if (!existsSync(sourcePath)) {
    continue;
  }

  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
}
