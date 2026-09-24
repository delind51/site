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

function initAdminPrototype() {
  const form = document.querySelector('[data-admin-form]');

  if (!form) {
    return;
  }

  const sectionInput = form.elements.section;
  const languageInput = form.elements.language;
  const titleInput = form.elements.title;
  const slugInput = form.elements.slug;
  const leadInput = form.elements.lead;
  const bodyInput = form.elements.body;
  const imagesInput = form.elements.images;
  const resetButton = document.querySelector('[data-admin-reset]');
  const status = document.querySelector('[data-admin-status]');
  const previewSection = document.querySelector('[data-preview-section]');
  const previewLabel = document.querySelector('[data-preview-label]');
  const previewTitle = document.querySelector('[data-preview-title]');
  const previewLead = document.querySelector('[data-preview-lead]');
  const previewBody = document.querySelector('[data-preview-body]');
  const previewMedia = document.querySelector('[data-preview-media]');

  const sectionLabels = {
    places: { ru: 'Места', en: 'Places', code: 'PLACE' },
    frequency: { ru: 'Частота', en: 'Frequency', code: 'FREQUENCY' },
    objects: { ru: 'Объекты', en: 'Objects', code: 'OBJECT' },
    projects: { ru: 'Проекты', en: 'Projects', code: 'PROJECT' },
  };

  let previewImageUrl = '';

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function renderPreviewImage() {
    if (!previewMedia) {
      return;
    }

    previewMedia.innerHTML = '';

    if (previewImageUrl) {
      const image = document.createElement('img');
      image.src = previewImageUrl;
      image.alt = titleInput.value || 'Preview image';
      previewMedia.append(image);
      return;
    }

    const placeholder = document.createElement('span');
    placeholder.textContent = 'PHOTO / 16:10';
    previewMedia.append(placeholder);
  }

  function updatePreview() {
    const section = sectionLabels[sectionInput.value] ?? sectionLabels.places;
    const language = languageInput.value === 'en' ? 'en' : 'ru';
    const title = titleInput.value.trim() || (language === 'ru' ? 'Без названия' : 'Untitled');
    const lead = leadInput.value.trim() || (language === 'ru' ? 'Короткое описание материала.' : 'Short entry description.');
    const body = bodyInput.value.trim() || (language === 'ru' ? 'Основной текст материала.' : 'Main entry text.');
    const slug = slugInput.value.trim() || 'new-entry';

    previewSection.textContent = section.code;
    previewLabel.textContent = `${section.code} / DRAFT`;
    previewTitle.textContent = title;
    previewLead.textContent = lead;
    previewBody.textContent = body;
    setStatus(`Статус: черновик не сохранён. Будущий адрес: /${sectionInput.value}/${slug}/`);
  }

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  imagesInput.addEventListener('change', () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      previewImageUrl = '';
    }

    const [file] = imagesInput.files;

    if (file) {
      previewImageUrl = URL.createObjectURL(file);
      setStatus(`Статус: выбрано фото “${file.name}”, пока только для preview.`);
    }

    renderPreviewImage();
    updatePreview();
  });

  resetButton?.addEventListener('click', () => {
    form.reset();

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      previewImageUrl = '';
    }

    renderPreviewImage();
    updatePreview();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus('Статус: прототип готов. Следующий этап — подключить настоящее сохранение и вход.');
  });

  updatePreview();
}

initAdminPrototype();
