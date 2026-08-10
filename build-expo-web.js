const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🚀 Building Expo Web (localhost:8081 version) for Production...");

const mobileDir = path.join(__dirname, 'mobile');
const distDir = path.join(mobileDir, 'dist');
const targetBuildDir = path.join(__dirname, 'frontend', 'build');

try {
  // 1. Install mobile dependencies
  console.log("📦 Installing mobile dependencies...");
  execSync('npm install', { cwd: mobileDir, stdio: 'inherit' });

  // 2. Export Expo Web
  console.log("⚡ Exporting Expo Web bundle...");
  execSync('npx expo export --platform web', { cwd: mobileDir, stdio: 'inherit' });

  // 3. Ensure frontend/build target directory exists
  if (fs.existsSync(targetBuildDir)) {
    fs.rmSync(targetBuildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetBuildDir, { recursive: true });

  // 4. Copy dist to frontend/build
  function copyFolderRecursive(source, target) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursive(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }

  copyFolderRecursive(distDir, targetBuildDir);

  // 5. Copy llms.txt if present
  const llmsSource = path.join(__dirname, 'frontend', 'public', 'llms.txt');
  const llmsTarget = path.join(targetBuildDir, 'llms.txt');
  if (fs.existsSync(llmsSource)) {
    fs.copyFileSync(llmsSource, llmsTarget);
  }

  console.log("✅ Expo Web (localhost:8081 1:1 match) successfully exported to frontend/build!");
} catch (err) {
  console.error("❌ Build error:", err.message);
  process.exit(1);
}
