import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { publishEntry } from './scripts/publish-entry.js';

const port = Number(process.env.PORT) || 3000;
const root = process.cwd();

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function safeSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9а-яё._-]+/gi, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')
    || 'file';
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 80 * 1024 * 1024) {
        reject(new Error('Payload is too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function savePhoto(uploadDirectory, photo, index) {
  const extension = extname(photo.originalName || '') || '.jpg';
  const targetName = `${String(index + 1).padStart(2, '0')}-${safeSegment(photo.originalName || `photo${extension}`)}`;
  const base64 = String(photo.dataUrl || '').split(',')[1];

  if (!base64) {
    throw new Error(`Missing image data for ${photo.originalName}`);
  }

  writeFileSync(join(uploadDirectory, targetName), Buffer.from(base64, 'base64'));

  return {
    originalName: photo.originalName,
    targetName,
    role: photo.role,
    fit: photo.fit,
    renderFit: photo.renderFit,
    focus: photo.focus,
    size: photo.size,
    ratio: photo.ratio,
  };
}

async function handlePublish(request, response) {
  try {
    const payload = JSON.parse(await readRequestBody(request));
    const section = safeSegment(payload.section);
    const slug = safeSegment(payload.slug);
    const language = payload.language === 'en' ? 'en' : 'ru';
    const uploadPath = `content/uploads/${section}/${slug}/`;
    const uploadDirectory = join(root, uploadPath);

    mkdirSync(uploadDirectory, { recursive: true });

    const photos = (payload.photos ?? []).map((photo, index) => savePhoto(uploadDirectory, photo, index));
    const entry = {
      schema: 'personal-index.entry.v1',
      status: 'draft',
      section,
      language,
      slug,
      title: payload.title,
      lead: payload.lead,
      body: payload.body,
      paths: {
        content: `content/${section}/${slug}.${language}.json`,
        publicUrl: `/${section}/${slug}/`,
        uploads: uploadPath,
      },
      photos,
      updatedAt: new Date().toISOString(),
    };

    const contentPath = join(root, entry.paths.content);
    mkdirSync(join(root, 'content', section), { recursive: true });
    writeFileSync(contentPath, `${JSON.stringify(entry, null, 2)}\n`);

    const result = publishEntry(root, entry);

    sendJson(response, 200, {
      ok: true,
      entry,
      result,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message,
    });
  }
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);

  if (request.method === 'POST' && pathname === '/api/publish') {
    handlePublish(request, response);
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    const notFoundPath = join(root, '404.html');

    if (existsSync(notFoundPath)) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      createReadStream(notFoundPath).pipe(response);
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Site: http://localhost:${port}`);
});
