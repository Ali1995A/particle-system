import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destDir = path.join(repoRoot, 'public', 'mediapipe', 'wasm');

const main = async () => {
  await fs.mkdir(destDir, { recursive: true });
  await fs.cp(sourceDir, destDir, { recursive: true, force: true });
  // The model file is committed under public/mediapipe/models/hand_landmarker.task
};

main().catch((err) => {
  console.error('Failed to copy mediapipe wasm assets:', err);
  process.exitCode = 1;
});
