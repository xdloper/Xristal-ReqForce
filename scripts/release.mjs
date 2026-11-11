import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const bumpType = process.argv[2] || 'patch'; // patch | minor | major
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major>');
  process.exit(1);
}

const pkgPath = path.resolve('package.json');
const manifestPath = path.resolve('public/manifest.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);

let nextVersion = '';
if (bumpType === 'major') {
  nextVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  nextVersion = `${major}.${minor + 1}.0`;
} else {
  nextVersion = `${major}.${minor}.${patch + 1}`;
}

// 1. Sync version across package.json and public/manifest.json
pkg.version = nextVersion;
manifest.version = nextVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

// 2. Build fresh dist/chrome, dist/edge, dist/firefox bundles with the new version
execSync('npm run build', { stdio: 'inherit' });

// 3. Stage, commit, tag, and push
execSync('git add -A', { stdio: 'inherit' });
execSync(`git commit -m "chore(release): v${nextVersion}"`, { stdio: 'inherit' });
execSync(`git tag -a v${nextVersion} -m "Release v${nextVersion}"`, { stdio: 'inherit' });
execSync('git push origin main --tags', { stdio: 'inherit' });

console.log(`✅ Released and pushed v${nextVersion}`);
