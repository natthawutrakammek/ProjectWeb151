function sendHtml(res, html, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  });
  res.end(html);
}

function sendText(res, text, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(text);
}

function redirect(res, location) {
  res.writeHead(303, {
    Location: location,
    'Cache-Control': 'no-store'
  });
  res.end();
}

function setCookie(res, name, value, options = {}) {
  const pieces = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? '/'}`,
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (options.maxAge !== undefined) {
    pieces.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    pieces.push(`Expires=${options.expires.toUTCString()}`);
  }

  res.setHeader('Set-Cookie', pieces.join('; '));
}

function clearCookie(res, name) {
  setCookie(res, name, '', {
    maxAge: 0,
    expires: new Date(0)
  });
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const index = pair.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

module.exports = {
  clearCookie,
  parseCookies,
  redirect,
  sendHtml,
  sendText,
  setCookie
};
