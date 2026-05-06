const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');
const IMAGE_DIR = path.resolve(__dirname, '..', '..', 'images');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.js': 'text/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function sendStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const requestedPath = decodeURIComponent(url.pathname);
  let rootDir = '';
  let relativePath = '';

  if (requestedPath.startsWith('/assets/') || requestedPath.startsWith('/uploads/')) {
    rootDir = PUBLIC_DIR;
    relativePath = path.normalize(requestedPath.slice(1));
  } else if (requestedPath.startsWith('/images/')) {
    rootDir = IMAGE_DIR;
    relativePath = path.normalize(requestedPath.slice('/images/'.length));
  } else {
    return false;
  }

  const filePath = path.resolve(rootDir, relativePath);

  if (filePath !== rootDir && !filePath.startsWith(`${rootDir}${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff'
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

module.exports = {
  sendStatic
};
