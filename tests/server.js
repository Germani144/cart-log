// Dev-only static server for the tests: serves the repo root (the app exactly as GitHub Pages would).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]).replace(/^\/cart-log/, '');
    let file = path.join(root, url.endsWith('/') ? url + 'index.html' : url);
    if (!file.startsWith(root) || file.includes(`${path.sep}node_modules${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(body);
    });
  })
  .listen(port, () => console.log(`test server on http://localhost:${port}/cart-log/`));
