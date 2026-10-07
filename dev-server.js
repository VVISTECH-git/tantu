// Local stand-in for Vercel: serves public/ and routes /api/generate to the function.
const http = require('http');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const handler = require('./api/generate');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  if (req.url.startsWith('/api/generate')) {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
      handler(req, res);
    });
    return;
  }
  const file = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : path.normalize(req.url).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.end(data);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
