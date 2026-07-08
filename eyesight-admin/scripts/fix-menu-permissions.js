const fs = require('fs');
const path = require('path');

// Files to process
const files = [
  'src/features/admin/menu/admin-menu.config.ts',
  'src/features/portal/menu/portal-menu.config.ts',
];

const rootDir = path.join(__dirname, '..');

files.forEach((file) => {
  const filePath = path.join(rootDir, file);
  console.log(`\n📝 Processing: ${file}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Pattern 1: permissions: { permissions: ['xxx'], ... } -> permission: 'xxx'
  // Pattern 2: permissions: { permissions: ['xxx', 'yyy'], ... } -> permission: ['xxx', 'yyy']
  
  // Replace nested permissions structure
  content = content.replace(
    /permissions:\s*\{\s*permissions:\s*\[([^\]]+)\][^}]*\}/g,
    (match, perms) => {
      const cleanPerms = perms.trim();
      // Check if single or multiple
      const permArray = cleanPerms.split(',').map(p => p.trim());
      
      if (permArray.length === 1) {
        // Single permission
        return `permission: ${cleanPerms}`;
      } else {
        // Multiple permissions
        return `permission: [${cleanPerms}]`;
      }
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`⏭️  No changes needed: ${file}`);
  }
});

console.log('\n✨ Done!');
