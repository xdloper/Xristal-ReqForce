import fs from 'fs';
import path from 'path';

const rawBuildDir = path.resolve('dist/.raw');
const distRoot = path.resolve('dist');

const targets = ['chrome', 'edge', 'firefox'];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
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
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  copyDir(rawBuildDir, targetDir);

  const manifest = structuredClone(baseManifest);

  if (target === 'chrome' || target === 'edge') {
    // Chromium browsers use service_worker and don't want gecko/background.scripts warnings
    delete manifest.background.scripts;
    delete manifest.browser_specific_settings;
  } else if (target === 'firefox') {
    // Firefox uses background.scripts + browser_specific_settings.gecko
    delete manifest.background.service_worker;
  }

  fs.writeFileSync(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

// Remove temporary .raw build directory
fs.rmSync(rawBuildDir, { recursive: true, force: true });

console.log('Built clean browser folders inside dist/:');
console.log('  ├── dist/chrome/');
console.log('  ├── dist/edge/');
console.log('  └── dist/firefox/');
