import http.server
import socketserver
import os
import sys

# Cambiar al directorio dist
dist_dir = os.path.join(os.path.dirname(__file__), '..', 'dist')
if not os.path.exists(dist_dir):
    print("❌ Error: dist directory not found!")
    print("💡 Please run: npm run build:csr")
    sys.exit(1)

os.chdir(dist_dir)

PORT = 3002

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Si es una ruta que no existe y no es un archivo _next, servir index.html
        if not os.path.exists(self.path[1:]) and not self.path.startswith('/_next/'):
            self.path = '/index.html'
        return super().do_GET()

with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
    print(f"🐍 Python server running at http://localhost:{PORT}")
    print("📁 Serving files from dist/ directory")
    print("🎯 This is your CSR app running locally!")
    print("✨ Press Ctrl+C to stop the server")
    httpd.serve_forever()
