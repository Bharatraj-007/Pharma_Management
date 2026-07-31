const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(path.join(__dirname, 'src'));
console.log(`Checking ${files.length} mobile source files for syntax errors...\n`);

let errors = 0;
files.forEach((file) => {
  try {
    execSync(`node --check "${file}"`);
    console.log(`✅ ${path.relative(__dirname, file)}`);
  } catch (err) {
    console.error(`❌ SYNTAX ERROR in ${path.relative(__dirname, file)}:`, err.message);
    errors++;
  }
});

if (errors === 0) {
  console.log(`\n🎉 ALL ${files.length} MOBILE SOURCE FILES ARE 100% SYNTAX ERROR FREE! 💯`);
  process.exit(0);
} else {
  console.error(`\n❌ Found ${errors} syntax errors.`);
  process.exit(1);
}
