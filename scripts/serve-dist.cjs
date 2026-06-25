const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT || process.argv[2] || 5175);
const host = '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, requested);

  if (!filePath.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, 'index.html'), (fallbackError, fallback) => {
        if (fallbackError) send(res, 404, 'Not found');
        else send(res, 200, fallback, 'text/html; charset=utf-8');
      });
      return;
    }

    send(res, 200, data, mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(port, host, () => {
  console.log(`Focus Broker 网页版已启动：http://${host}:${port}/`);
});
