const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      content = content.replace(/'king-inputs'/g, "`king-inputs-${auth.currentUser?.uid || 'guest'}`");
      content = content.replace(/'king-submissions'/g, "`king-submissions-${auth.currentUser?.uid || 'guest'}`");
      content = content.replace(/'king-score'/g, "`king-score-${auth.currentUser?.uid || 'guest'}`");
      content = content.replace(/'king-skips'/g, "`king-skips-${auth.currentUser?.uid || 'guest'}`");
      content = content.replace(/'king-system'/g, "`king-system-${auth.currentUser?.uid || 'guest'}`");
      content = content.replace(/'king-system-keys'/g, "`king-system-keys-${auth.currentUser?.uid || 'guest'}`");

      if (content !== original) {
        if (!content.includes("from '../firebase'") && !content.includes("from './firebase'")) {
          const importPath = directory === dir ? "'./firebase'" : "'../firebase'";
          content = `import { auth } from ${importPath};\n` + content;
        } else if (!content.includes('auth')) {
          content = content.replace(/import\s+\{([^}]*)\}\s+from\s+(['"]\.\.?\/firebase['"]);/, (match, p1, p2) => {
            if (!p1.includes('auth')) {
              return `import { auth, ${p1.trim()} } from ${p2};`;
            }
            return match;
          });
        }
        
        fs.writeFileSync(fullPath, content);
        console.log('Processed', fullPath);
      }
    }
  }
}

try {
  processDir(dir);
  console.log('Done');
} catch (err) {
  console.error(err);
}
