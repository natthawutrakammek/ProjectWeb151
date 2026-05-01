const { sendText } = require('./http');

const MAX_BODY_BYTES = 5 * 1024 * 1024;

function compilePath(pathPattern) {
  const keys = [];
  const regexText = pathPattern
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return {
    keys,
    regex: new RegExp(`^${regexText}$`)
  };
}

function paramsFromMatch(keys, match) {
  const params = {};
  keys.forEach((key, index) => {
    params[key] = decodeURIComponent(match[index + 1]);
  });
  return params;
}

function bodyToObject(bodyText) {
  const params = new URLSearchParams(bodyText);
  const body = {};

  for (const [key, value] of params.entries()) {
    if (body[key] === undefined) {
      body[key] = value;
    } else if (Array.isArray(body[key])) {
      body[key].push(value);
    } else {
      body[key] = [body[key], value];
    }
  }

  return body;
}

function splitBuffer(buffer, separator) {
  const chunks = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    chunks.push(buffer.slice(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  chunks.push(buffer.slice(start));
  return chunks;
}

function parseMultipart(buffer, boundary) {
  const body = {};
  const files = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const sections = splitBuffer(buffer, boundaryBuffer);

  for (const rawSection of sections) {
    if (!rawSection.length) {
      continue;
    }

    let section = rawSection;
    if (section.subarray(0, 2).toString() === '\r\n') {
      section = section.subarray(2);
    } else if (section.subarray(0, 1).toString() === '\n') {
      section = section.subarray(1);
    }

    if (section.equals(Buffer.from('--\r\n')) || section.equals(Buffer.from('--'))) {
      continue;
    }

    if (section.subarray(section.length - 2).toString() === '\r\n') {
      section = section.subarray(0, section.length - 2);
    } else if (section.subarray(section.length - 1).toString() === '\n') {
      section = section.subarray(0, section.length - 1);
    }

    let headerEnd = section.indexOf(Buffer.from('\r\n\r\n'));
    let separatorLength = 4;

    if (headerEnd === -1) {
      headerEnd = section.indexOf(Buffer.from('\n\n'));
      separatorLength = 2;
    }

    if (headerEnd === -1) {
      continue;
    }

    const headerText = section.subarray(0, headerEnd).toString('utf8');
    const content = section.subarray(headerEnd + separatorLength);
    const headers = {};

    for (const line of headerText.split(/\r?\n/)) {
      const [name, ...rest] = line.split(':');
      if (name && rest.length) {
        headers[name.trim().toLowerCase()] = rest.join(':').trim();
      }
    }

    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    if (!nameMatch) {
      continue;
    }

    const fieldName = nameMatch[1];
    const fileMatch = disposition.match(/filename="([^"]*)"/i);
    if (fileMatch) {
      const filename = fileMatch[1];
      files[fieldName] = {
        contentType: headers['content-type'] || 'application/octet-stream',
        data: content,
        filename,
        size: content.length
      };
    } else {
      body[fieldName] = content.toString('utf8');
    }
  }

  return { body, files };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      resolve({ body: {}, files: {} });
      return;
    }

    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      chunks.push(chunk);
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      const contentType = req.headers['content-type'] ?? '';
      const buffer = Buffer.concat(chunks);

      if (contentType.includes('application/x-www-form-urlencoded')) {
        resolve({
          body: bodyToObject(buffer.toString('utf8')),
          files: {}
        });
        return;
      }

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!boundaryMatch) {
          resolve({ body: {}, files: {} });
          return;
        }

        const boundary = boundaryMatch[1] || boundaryMatch[2];
        resolve(parseMultipart(buffer, boundary));
        return;
      }

      resolve({ body: {}, files: {} });
    });

    req.on('error', reject);
  });
}

class Router {
  constructor() {
    this.routes = [];
  }

  get(pathPattern, ...handlers) {
    this.add('GET', pathPattern, handlers);
  }

  post(pathPattern, ...handlers) {
    this.add('POST', pathPattern, handlers);
  }

  add(method, pathPattern, handlers) {
    const compiled = compilePath(pathPattern);
    this.routes.push({
      method,
      pathPattern,
      handlers,
      ...compiled
    });
  }

  async handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams.entries());
    const parsed = await parseBody(req);
    req.body = parsed.body;
    req.files = parsed.files;

    for (const route of this.routes) {
      if (route.method !== req.method) {
        continue;
      }

      const match = req.path.match(route.regex);
      if (!match) {
        continue;
      }

      req.params = paramsFromMatch(route.keys, match);
      await this.runHandlers(route.handlers, req, res);
      return;
    }

    sendText(res, 'ไม่พบหน้าที่ต้องการ', 404);
  }

  async runHandlers(handlers, req, res) {
    let index = -1;

    const next = async () => {
      index += 1;
      const handler = handlers[index];
      if (!handler || res.writableEnded) {
        return;
      }
      await handler(req, res, next);
    };

    await next();
  }
}

module.exports = Router;
