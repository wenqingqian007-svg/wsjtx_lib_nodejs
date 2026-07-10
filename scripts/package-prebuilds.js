#!/usr/bin/env node

/**
 * Package prebuilt binaries for npm publishing
 * 
 * This script helps package the prebuilt binaries from GitHub Actions
 * into proper npm-compatible format for publishing.
 */

import fs from 'fs';
import path from 'path';

const PREBUILDS_DIR = 'prebuilds';
const SUPPORTED_PLATFORMS = [
  { platform: 'linux', arch: 'x64' },
  { platform: 'linux', arch: 'arm64' },
  { platform: 'linux-musl', arch: 'x64' },
  { platform: 'linux-musl', arch: 'arm64' },
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'win32', arch: 'x64' }
];

console.log('📦 Packaging prebuilt binaries for npm...\n');

// Check if prebuilds directory exists
if (!fs.existsSync(PREBUILDS_DIR)) {
  console.error(`❌ Prebuilds directory not found: ${PREBUILDS_DIR}`);
  console.error('   Please run the GitHub Actions build first to generate prebuilds.');
  process.exit(1);
}

// Validate and report prebuilt packages
let validPackages = 0;
let totalSize = 0;

for (const { platform, arch } of SUPPORTED_PLATFORMS) {
  const platformDir = `${platform}-${arch}`;
  const fullPath = path.join(PREBUILDS_DIR, platformDir);
  
  if (fs.existsSync(fullPath)) {
    const nodeFile = path.join(fullPath, 'wsjtx_lib_nodejs.node');
    const infoFile = path.join(fullPath, 'build-info.json');
    
    if (fs.existsSync(nodeFile)) {
      validPackages++;
      const stats = fs.statSync(nodeFile);
      const size = stats.size;
      totalSize += size;
      
      console.log(`✅ ${platformDir}:`);
      console.log(`   • Native module: ${(size / 1024 / 1024).toFixed(2)} MB`);
      
      // Read build info if available
      if (fs.existsSync(infoFile)) {
        try {
          const buildInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
          if (buildInfo.bundled_libraries) {
            console.log(`   • Bundled libraries: ${buildInfo.bundled_libraries}`);
          }
          if (buildInfo.total_package_size) {
            console.log(`   • Total package: ${(buildInfo.total_package_size / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (e) {
          console.log(`   • Build info: Available`);
        }
      }
      
      // List additional files (DLLs, dylibs, etc.)
      const files = fs.readdirSync(fullPath);
      const additionalFiles = files.filter(f => f !== 'wsjtx_lib_nodejs.node' && f !== 'build-info.json');
      if (additionalFiles.length > 0) {
        console.log(`   • Additional files: ${additionalFiles.join(', ')}`);
      }
      
    } else {
      console.log(`❌ ${platformDir}: Missing .node file`);
    }
  } else {
    console.log(`❌ ${platformDir}: Directory not found`);
  }
  console.log();
}

console.log(`📊 Summary:`);
console.log(`   • Valid packages: ${validPackages}/${SUPPORTED_PLATFORMS.length}`);
console.log(`   • Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

if (validPackages === 0) {
  console.error('\n❌ No valid prebuilt packages found!');
  process.exit(1);
}

if (validPackages < SUPPORTED_PLATFORMS.length) {
  console.warn('\n⚠️  Some platforms are missing prebuilt packages.');
  console.warn('   Users on missing platforms will need to compile from source.');
}

// Create package info
const packageInfo = {
  timestamp: new Date().toISOString(),
  platforms: SUPPORTED_PLATFORMS.map(({ platform, arch }) => {
    const platformDir = `${platform}-${arch}`;
    const fullPath = path.join(PREBUILDS_DIR, platformDir);
    const nodeFile = path.join(fullPath, 'wsjtx_lib_nodejs.node');
    
    return {
      platform,
      arch,
      available: fs.existsSync(nodeFile),
      path: `./${PREBUILDS_DIR}/${platformDir}/wsjtx_lib_nodejs.node`
    };
  }),
  totalPackages: validPackages,
  totalSize: totalSize
};

fs.writeFileSync(
  path.join(PREBUILDS_DIR, 'package-info.json'),
  JSON.stringify(packageInfo, null, 2)
);

console.log('\n✅ Prebuilt packages are ready for npm publishing!');
console.log('\nNext steps:');
console.log('1. npm version patch|minor|major');
console.log('2. npm publish');
console.log('3. Create GitHub release with prebuilt assets'); 