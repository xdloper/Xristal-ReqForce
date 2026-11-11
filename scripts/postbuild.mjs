import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const chromeDir = path.resolve('dist-chrome-edge');
const firefoxDir = path.resolve('dist-firefox');

function copyDir(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
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

const baseManifest = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'));

// 1. Chrome & Edge Manifest (uses service_worker only, removes Firefox-only scripts warning)
copyDir(distDir, chromeDir);
const chromeManifest = structuredClone(baseManifest);
delete chromeManifest.background.scripts;
delete chromeManifest.browser_specific_settings;
fs.writeFileSync(path.join(chromeDir, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));

// 2. Firefox Manifest (uses background.scripts + gecko settings)
copyDir(distDir, firefoxDir);
const firefoxManifest = structuredClone(baseManifest);
delete firefoxManifest.background.service_worker;
fs.writeFileSync(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));

// Update dist manifest to Chrome/Edge compatible by default while keeping universal compatibility
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));

console.log('✅ Build complete!');
console.log('   - Chrome / Edge / Brave folder: dist-chrome-edge/ (or dist/)');
console.log('   - Mozilla Firefox folder:       dist-firefox/');
