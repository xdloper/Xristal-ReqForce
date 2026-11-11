import fs from 'fs';
import path from 'path';

const rawBuildDir = path.resolve('dist/.raw');
const distRoot = path.resolve('dist');

const targets = ['chrome', 'edge', 'firefox'];

function syncDirInPlace(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  // Remove old entries inside dest without deleting the dest directory inode itself
  for (const existing of fs.readdirSync(dest)) {
    fs.rmSync(path.join(dest, existing), { recursive: true, force: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      syncDirInPlace(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const baseManifest = JSON.parse(
  fs.readFileSync(path.join(rawBuildDir, 'manifest.json'), 'utf-8')
);

for (const target of targets) {
  const targetDir = path.join(distRoot, target);
  syncDirInPlace(rawBuildDir, targetDir);

  const manifest = structuredClone(baseManifest);

  if (target === 'chrome' || target === 'edge') {
    delete manifest.background.scripts;
    delete manifest.browser_specific_settings;
  } else if (target === 'firefox') {
    delete manifest.background.service_worker;
  }

  fs.writeFileSync(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

fs.rmSync(rawBuildDir, { recursive: true, force: true });

console.log('Built clean browser folders inside dist/:');
console.log('  ├── dist/chrome/');
console.log('  ├── dist/edge/');
console.log('  └── dist/firefox/');
