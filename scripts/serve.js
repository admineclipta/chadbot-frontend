const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const distDir = path.join(__dirname, '..', 'dist');

// MIME types para diferentes archivos
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  
  // Si es una ruta que no existe, servir index.html (SPA routing)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (req.url.startsWith('/_next/')) {
      // Si es un archivo _next que no existe, devolver 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    
    // Para rutas SPA, servir index.html
    filePath = path.join(distDir, 'index.html');
  }
  
  serveFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('📁 Serving files from dist/ directory');
  console.log('🎯 This is your CSR app running locally!');
  console.log('✨ Press Ctrl+C to stop the server');
});
