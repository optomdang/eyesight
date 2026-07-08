const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'admin', 'menu', 'admin-menu.config.ts');

console.log('📝 Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to match:
// permissions: {
//   permissions: ['xxx', 'yyy'],
//   roles: ['admin'],
// },

// Replace with:
// permission: ['xxx', 'yyy'],

content = content.replace(
  /permissions:\s*\{\s*permissions:\s*(\[[^\]]+\]),?\s*(?:roles:\s*\[[^\]]*\],?\s*)?\},?/g,
  'permission: $1,'
);

// Also handle single permission
content = content.replace(
  /permission:\s*\[\s*'([^']+)'\s*\],/g,
  (match, perm) => {
    // Keep as array if multiple, or convert to string if single
    return `permission: '${perm}',`;
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed menu structure!');
