const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, 'client', 'package.json'))) {
  console.log('[Build] Building client from repository root...');
  execSync('npm --prefix client install && npm --prefix client run build', { stdio: 'inherit' });
} else {
  console.log('[Build] Building directly inside client...');
  execSync('npm run build', { stdio: 'inherit' });
}
