document.documentElement.classList.add('js-enabled');

const entryRegistry = {
  places: [
    { slug: 'cologne', title: { ru: 'Кёльн', en: 'Cologne' } },
    { slug: 'thasos', title: { ru: 'Тасос', en: 'Thasos' } },
  ],
  frequency: [
    { slug: 'current-rotation', title: { ru: 'Текущая ротация', en: 'Current rotation' } },
    { slug: 'albums', title: { ru: 'Альбомы', en: 'Albums' } },
  ],
  objects: [
    { slug: 'sneakers', title: { ru: 'Кроссовки', en: 'Sneakers' } },
    { slug: 'clothing', title: { ru: 'Одежда', en: 'Clothing' } },
  ],
  projects: [
    { slug: 'applications', title: { ru: 'Приложения', en: 'Applications' } },
    { slug: 'experiments', title: { ru: 'Эксперименты', en: 'Experiments' } },
  ],
};

function getCurrentEntry() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const baseIndex = pathParts.findIndex((part) => part === 'en' || entryRegistry[part]);

  if (baseIndex === -1) {
    return null;
  }

  const language = pathParts[baseIndex] === 'en' ? 'en' : 'ru';
  const offset = language === 'en' ? baseIndex + 1 : baseIndex;
  const section = pathParts[offset];
  const slug = pathParts[offset + 1];

  if (!entryRegistry[section] || !slug) {
    return null;
  }

  const entries = entryRegistry[section];
  const index = entries.findIndex((entry) => entry.slug === slug);

  if (index === -1) {
    return null;
  }

  return { entries, index, language, section };
}

function createPagerLink(entry, direction, language) {
  const link = document.createElement('a');
  link.href = `../${entry.slug}/index.html`;

  const label = document.createElement('small');
  label.textContent = language === 'ru'
    ? direction === 'previous' ? 'Предыдущий материал' : 'Следующий материал'
    : direction === 'previous' ? 'Previous entry' : 'Next entry';

  const title = document.createElement('strong');
  title.textContent = direction === 'previous'
    ? `← ${entry.title[language]}`
    : `${entry.title[language]} →`;

  link.append(label, title);
  return link;
}

function renderEntryPager() {
  const current = getCurrentEntry();
  const article = document.querySelector('.entry-page');

  if (!current || !article) {
    return;
  }

  const previous = current.entries[current.index - 1];
  const next = current.entries[current.index + 1];
  const existingPager = article.querySelector('.entry-pager');
  const pager = document.createElement('nav');

  pager.className = 'entry-pager';
  pager.setAttribute(
    'aria-label',
    current.language === 'ru' ? 'Навигация по материалам' : 'Entry navigation',
  );

  pager.append(
    previous ? createPagerLink(previous, 'previous', current.language) : document.createElement('span'),
    next ? createPagerLink(next, 'next', current.language) : document.createElement('span'),
  );

  if (existingPager) {
    existingPager.replaceWith(pager);
    return;
  }

  article.append(pager);
}

renderEntryPager();
