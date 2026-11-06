const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client');
if (fs.existsSync(path.join(clientDir, 'package.json'))) {
  console.log('[Build] Building client from repository root...');
  execSync('npm install && npm run build', { cwd: clientDir, stdio: 'inherit' });
} else {
  console.log('[Build] Building directly inside client directory...');
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
}
