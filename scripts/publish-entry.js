import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const sectionMeta = {
  places: { ru: 'Места', en: 'Places', code: 'PLACE' },
  frequency: { ru: 'Частота', en: 'Frequency', code: 'FREQUENCY' },
  objects: { ru: 'Объекты', en: 'Objects', code: 'OBJECT' },
  projects: { ru: 'Проекты', en: 'Projects', code: 'PROJECT' },
};

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

function photoPath(entry, photo) {
  return `../../${entry.paths.uploads}${photo.targetName}`;
}

function renderMediaSlider(entry) {
  if (!entry.photos.length) {
    return `<div class="entry-page-media" role="img" aria-label="Место для изображения"><span>PHOTO / 16:10</span></div>`;
  }

  const cover = entry.photos.find((photo) => photo.role === 'cover') ?? entry.photos[0];
  const photos = [cover, ...entry.photos.filter((photo) => photo !== cover)];
  const total = String(photos.length).padStart(2, '0');

  return `<section class="entry-media-slider" data-entry-carousel aria-label="Фотографии: ${escapeHtml(entry.title)}">
        <div class="entry-media-track" data-entry-slider>
          ${photos.map((photo, index) => `<figure class="entry-media-slide entry-media-slide-${photo.size}${index === 0 ? ' is-active' : ''}" data-entry-slide data-fit="${photo.renderFit}" data-focus="${photo.focus}" aria-hidden="${index === 0 ? 'false' : 'true'}">
            <img src="${photoPath(entry, photo)}" alt="${escapeHtml(entry.title)} — фото ${index + 1}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} />
          </figure>`).join('\n          ')}
        </div>
        ${photos.length > 1 ? `<button class="entry-slider-arrow entry-slider-arrow-prev" type="button" data-slider-prev aria-label="Предыдущее фото">←</button>
        <button class="entry-slider-arrow entry-slider-arrow-next" type="button" data-slider-next aria-label="Следующее фото">→</button>
        <p class="entry-slider-count" aria-live="polite"><span data-slider-current>01</span> / ${total}</p>` : ''}
      </section>`;
}

function renderEntryPage(entry) {
  const section = sectionMeta[entry.section];
  const description = escapeHtml(entry.lead || `${entry.title} — материал раздела ${section.ru}.`);
  const title = escapeHtml(entry.title);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <title>${title} — VLADIMIR IALAMA</title>
    <link rel="stylesheet" href="../../styles.css?v=unified-photo-slider" />
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

        ${renderMediaSlider(entry)}

        <section class="entry-page-body generated-entry-body" aria-label="Материал">
          <div class="entry-page-copy generated-entry-copy">
            ${paragraphize(entry.body)}
          </div>
        </section>
      </article>
    </main>

    <script src="../../script.js?v=unified-photo-slider"></script>
  </body>
</html>
`;
}

function updateSectionIndex(root, entry) {
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

  const existingLinks = html.match(/class="place-row place-row-link"/g) ?? [];
  const nextNumber = String(existingLinks.length + 1).padStart(2, '0');
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
            <span>${String(existingLinks.length + 2).padStart(2, '0')}</span>
            <h3>Следующее место</h3>
            <p>Свободная ячейка для новой поездки или города.</p>
            <small>Пусто</small>
          </article>`);

  writeFileSync(indexPath, updated);
}

export function publishEntry(root, entry) {
  const section = sectionMeta[entry.section];

  if (!section) {
    throw new Error(`Unknown section: ${entry.section}`);
  }

  const outputPath = join(root, entry.section, entry.slug, 'index.html');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderEntryPage(entry));
  updateSectionIndex(root, entry);

  return {
    path: `${entry.section}/${entry.slug}/index.html`,
    url: `/${entry.section}/${entry.slug}/index.html`,
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const [, , jsonPath] = process.argv;

  if (!jsonPath) {
    console.error('Usage: npm run publish-entry -- content/<section>/<slug>.ru.json');
    process.exit(1);
  }

  const root = process.cwd();
  const entry = JSON.parse(readFileSync(join(root, jsonPath), 'utf8'));
  const result = publishEntry(root, entry);

  console.log(`Published entry: ${result.path}`);
}
