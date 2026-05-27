const http = require('http');
const https = require('https');
const url = require('url');

const MDE_USER   = process.env.MDE_USER   || 'sueleymantuerkdoenmez';
const MDE_PASS   = process.env.MDE_PASS   || 'b94LjacMTL2G';
const MDE_SELLER = process.env.MDE_SELLER || '1191390';
const PORT       = process.env.PORT       || 3001;
const AUTH       = 'Basic ' + Buffer.from(MDE_USER + ':' + MDE_PASS).toString('base64');
const ACCEPT     = 'application/vnd.de.mobile.api+json';

function mdeRequest(path) {
  return new Promise((resolve, reject) => {
    const fullUrl = 'https://services.mobile.de' + path;
    const parsed = url.parse(fullUrl);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.path,
      method: 'GET',
      headers: {
        'Authorization': AUTH,
        'Accept': ACCEPT,
        'User-Agent': 'AutoTrend24/1.0'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  console.log('Request:', req.method, path);

  // Health check
  if (path === '/' || path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', seller: MDE_SELLER, user: MDE_USER }));
    return;
  }

  // Alle Inserate: GET /api/inserate
  if (req.method === 'GET' && (path === '/api/inserate' || path === '/api/inserate/')) {
    try {
      const page = parsed.query.page || '1';
      const pageSize = parsed.query.pageSize || '100';
      const r = await mdeRequest('/seller-api/sellers/' + MDE_SELLER + '/ads?page=' + page + '&pageSize=' + pageSize);
      console.log('Inserate status:', r.status);
      res.writeHead(r.status);
      res.end(r.body);
    } catch(e) { 
      console.error('Inserate error:', e.message);
      res.writeHead(500); 
      res.end(JSON.stringify({error: e.message})); 
    }
    return;
  }

  // Bilder: GET /api/inserate/:id/images
  const imagesMatch = path.match(/^\/api\/inserate\/(\d+)\/images$/);
  if (req.method === 'GET' && imagesMatch) {
    const adId = imagesMatch[1];
    try {
      const r = await mdeRequest('/seller-api/sellers/' + MDE_SELLER + '/ads/' + adId + '/images');
      console.log('Images status for', adId, ':', r.status);
      res.writeHead(r.status);
      res.end(r.body);
    } catch(e) { 
      console.error('Images error:', e.message);
      res.writeHead(500); 
      res.end(JSON.stringify({error: e.message})); 
    }
    return;
  }

  // Einzelnes Inserat: GET /api/inserate/:id
  const adMatch = path.match(/^\/api\/inserate\/(\d+)$/);
  if (req.method === 'GET' && adMatch) {
    const adId = adMatch[1];
    try {
      const r = await mdeRequest('/seller-api/sellers/' + MDE_SELLER + '/ads/' + adId);
      console.log('Ad status for', adId, ':', r.status);
      res.writeHead(r.status);
      res.end(r.body);
    } catch(e) { 
      res.writeHead(500); 
      res.end(JSON.stringify({error: e.message})); 
    }
    return;
  }

  console.log('404:', path);
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: path }));
});

server.listen(PORT, () => {
  console.log('AUTOTREND24 Proxy auf Port ' + PORT);
  console.log('Seller:', MDE_SELLER, '| User:', MDE_USER);
});
