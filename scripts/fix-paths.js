const fs = require('fs');
const path = require('path');

function fixHtmlPaths(dir, baseDir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixHtmlPaths(filePath, baseDir);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Calcular rutas relativas basadas en la profundidad
      const relativePath = path.relative(dir, baseDir);
      const depth = relativePath === '' ? 0 : relativePath.split(path.sep).length;
      const prefix = depth === 0 ? './' : '../'.repeat(depth);
      
      // Reemplazar las rutas absolutas por relativas
      content = content.replace(/"\/_next\//g, `"${prefix}_next/`);
      content = content.replace(/'\/_next\//g, `'${prefix}_next/`);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed paths in: ${filePath} (depth: ${depth}, prefix: ${prefix})`);
    }
  });
}

// Ejecutar desde el directorio dist
const distDir = path.join(__dirname, '..', 'dist');
console.log('Looking for dist directory at:', distDir);

if (fs.existsSync(distDir)) {
  console.log('Found dist directory, fixing paths...');
  fixHtmlPaths(distDir, distDir);
  console.log('All HTML paths fixed for local serving!');
} else {
  console.error('dist directory not found at:', distDir);
  console.error('Please run "npm run build" first.');
}
