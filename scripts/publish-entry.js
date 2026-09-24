import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [, , jsonPath] = process.argv;

if (!jsonPath) {
  console.error('Usage: npm run publish-entry -- content/places/teriberka.ru.json');
  process.exit(1);
}

const root = process.cwd();
const entry = JSON.parse(readFileSync(join(root, jsonPath), 'utf8'));

const sectionMeta = {
  places: { ru: 'Места', en: 'Places', code: 'PLACE' },
  frequency: { ru: 'Частота', en: 'Frequency', code: 'FREQUENCY' },
  objects: { ru: 'Объекты', en: 'Objects', code: 'OBJECT' },
  projects: { ru: 'Проекты', en: 'Projects', code: 'PROJECT' },
};

const section = sectionMeta[entry.section];

if (!section) {
  console.error(`Unknown section: ${entry.section}`);
  process.exit(1);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function paragraphize(text = '') {
  return String(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

function photoPath(photo) {
  return `../../${entry.paths.uploads}${photo.targetName}`;
}

function renderMedia(photo) {
  if (!photo) {
    return `<div class="entry-page-media" role="img" aria-label="Место для изображения"><span>PHOTO / 16:10</span></div>`;
  }

  return `<figure class="entry-page-media entry-page-photo entry-page-photo-${photo.size}" data-fit="${photo.renderFit}" data-focus="${photo.focus}">
          <img src="${photoPath(photo)}" alt="${escapeHtml(entry.title)}" />
          <figcaption>${escapeHtml(photo.originalName)}</figcaption>
        </figure>`;
}

function renderGallery() {
  const gallery = entry.photos.filter((photo) => photo.role !== 'cover');

  if (!gallery.length) {
    return '';
  }

  return `<section class="entry-gallery" aria-label="Галерея">
        ${gallery.map((photo) => `<figure class="entry-gallery-item entry-gallery-item-${photo.size}" data-fit="${photo.renderFit}" data-focus="${photo.focus}">
          <img src="${photoPath(photo)}" alt="${escapeHtml(entry.title)} — ${escapeHtml(photo.originalName)}" />
          <figcaption>${escapeHtml(photo.originalName)}</figcaption>
        </figure>`).join('\n        ')}
      </section>`;
}

function renderEntryPage() {
  const cover = entry.photos.find((photo) => photo.role === 'cover') ?? entry.photos[0];
  const description = escapeHtml(entry.lead || `${entry.title} — материал раздела ${section.ru}.`);
  const title = escapeHtml(entry.title);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <title>${title} — VLADIMIR IALAMA</title>
    <link rel="stylesheet" href="../../styles.css?v=generated-entry" />
  </head>
  <body>
    <header class="site-header">
      <a class="identity" href="../../index.html#top" aria-label="VLADIMIR IALAMA — на главную">
        <span class="identity-full">VLADIMIR IALAMA</span>
        <span class="identity-short">VI</span>
      </a>
      <span class="site-label site-crumb" lang="en"><a href="../index.html">${entry.section.toUpperCase()}</a><span>/ ${title.toUpperCase()}</span></span>
      <nav class="site-nav" aria-label="Основная навигация">
        <a href="../../index.html#entries">Индекс</a>
      </nav>
    </header>

    <main>
      <article class="entry-page generated-entry" id="top">
        <header class="entry-page-hero">
          <a class="entry-back-link" href="../index.html" aria-label="Вернуться к списку">← ${section.ru}</a>
          <p class="section-label">${section.code} / DRAFT</p>
          <h1>${title}</h1>
          <p class="entry-page-lead">${escapeHtml(entry.lead)}</p>
        </header>

        ${renderMedia(cover)}

        <section class="entry-page-body" aria-label="Материал">
          <aside class="entry-page-meta">
            <span>Раздел: ${section.ru}</span>
            <span>Статус: ${escapeHtml(entry.status || 'draft')}</span>
            <span>Фото: ${entry.photos.length}</span>
          </aside>
          <div class="entry-page-copy">
            ${paragraphize(entry.body)}
          </div>
        </section>

        ${renderGallery()}
      </article>
    </main>

    <script src="../../script.js?v=photo-gallery-controls"></script>
  </body>
</html>
`;
}

function updateSectionIndex() {
  if (entry.section !== 'places') {
    return;
  }

  const indexPath = join(root, entry.section, 'index.html');

  if (!existsSync(indexPath)) {
    return;
  }

  const html = readFileSync(indexPath, 'utf8');

  if (html.includes(`href="./${entry.slug}/index.html"`)) {
    return;
  }

  const nextNumber = String((html.match(/class="place-row/g) ?? []).length + 1).padStart(2, '0');
  const row = `
          <a class="place-row place-row-link" href="./${entry.slug}/index.html" aria-label="Открыть материал ${escapeHtml(entry.title)}">
            <span>${nextNumber}</span>
            <h3>${escapeHtml(entry.title)}</h3>
            <p>${escapeHtml(entry.lead)}</p>
            <small>Открыть</small>
          </a>
`;

  const updated = html.replace(/\n\s*<article class="place-row place-row-empty">[\s\S]*?<\/article>/, `${row}
          <article class="place-row place-row-empty">
            <span>${String(Number(nextNumber) + 1).padStart(2, '0')}</span>
            <h3>Следующее место</h3>
            <p>Свободная ячейка для новой поездки или города.</p>
            <small>Пусто</small>
          </article>`);

  writeFileSync(indexPath, updated);
}

const outputPath = join(root, entry.section, entry.slug, 'index.html');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, renderEntryPage());
updateSectionIndex();

console.log(`Published entry: ${entry.section}/${entry.slug}/index.html`);
