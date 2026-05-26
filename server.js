const http = require('http');
const https = require('https');
const url = require('url');

const MDE_USER   = process.env.MDE_USER   || 'sueleymantuerkdoenmez';
const MDE_PASS   = process.env.MDE_PASS   || 'b94LjacMTL2G';
const MDE_SELLER = process.env.MDE_SELLER || '1191390';
const PORT       = process.env.PORT       || 3001;
const AUTH       = 'Basic ' + Buffer.from(MDE_USER + ':' + MDE_PASS).toString('base64');
const ACCEPT     = 'application/vnd.de.mobile.api+json';
const BASE       = 'https://services.mobile.de/seller-api/sellers/' + MDE_SELLER;

function mdeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse('https://services.mobile.de' + path);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.path,
      method: method || 'GET',
      headers: {
        'Authorization': AUTH,
        'Accept': ACCEPT,
        'Content-Type': ACCEPT
      }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS für alle Origins erlauben
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  // Health check
  if (path === '/' || path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', seller: MDE_SELLER, user: MDE_USER }));
    return;
  }

  // Alle Inserate laden
  if (req.method === 'GET' && path === '/api/inserate') {
    try {
      const page = parsed.query.page || '1';
      const pageSize = parsed.query.pageSize || '100';
      const r = await mdeRequest('/seller-api/sellers/' + MDE_SELLER + '/ads?page=' + page + '&pageSize=' + pageSize);
      res.writeHead(r.status);
      res.end(r.body);
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
    return;
  }

  // Bilder für ein Inserat
  if (req.method === 'GET' && path.startsWith('/api/inserate/') && path.endsWith('/images')) {
    try {
      const adId = path.split('/')[3];
      const r = await mdeRequest('/seller-api/sellers/' + MDE_SELLER + '/ads/' + adId + '/images');
      res.writeHead(r.status);
      res.end(r.body);
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('AUTOTREND24 mobile.de Proxy läuft auf Port ' + PORT);
  console.log('Seller: ' + MDE_SELLER + ' | User: ' + MDE_USER);
});
