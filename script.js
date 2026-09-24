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
  const photoFitInput = form.elements.photoFit;
  const photoFocusInput = form.elements.photoFocus;
  const photoSizeInput = form.elements.photoSize;
  const resetButton = document.querySelector('[data-admin-reset]');
  const status = document.querySelector('[data-admin-status]');
  const photoNote = document.querySelector('[data-photo-note]');
  const draftJsonOutput = document.querySelector('[data-draft-json]');
  const copyJsonButton = document.querySelector('[data-copy-json]');
  const downloadJsonButton = document.querySelector('[data-download-json]');
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
  let previewImageRatio = null;
  let currentDraft = {};

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

  function getAutoPhotoSize() {
    if (!previewImageRatio) {
      return 'normal';
    }

    if (previewImageRatio > 1.25) {
      return 'wide';
    }

    if (previewImageRatio < 0.85) {
      return 'tall';
    }

    return 'square';
  }

  function updatePhotoSettings() {
    const requestedFit = photoFitInput.value;
    const size = photoSizeInput.value === 'normal' ? getAutoPhotoSize() : photoSizeInput.value;
    const fit = requestedFit === 'auto' ? 'cover' : requestedFit;
    const focus = photoFocusInput.value;

    previewMedia.dataset.fit = fit;
    previewMedia.dataset.focus = focus;
    previewMedia.dataset.size = size;

    if (photoNote) {
      const readableSize = size === 'wide' ? 'wide 16:9' : size === 'tall' ? 'tall 4:5' : size === 'square' ? 'square 1:1' : 'normal';
      const readableFit = requestedFit === 'auto' ? 'auto → cover без искажения' : requestedFit === 'cover' ? 'cover → заполнить с обрезкой' : 'contain → показать целиком';
      photoNote.textContent = `Preview: ${readableFit}, ${readableSize}, focus ${focus}. Оригинал не режется.`;
    }
  }

  function getEffectivePhotoSettings() {
    const requestedFit = photoFitInput.value;
    const size = photoSizeInput.value === 'normal' ? getAutoPhotoSize() : photoSizeInput.value;

    return {
      fit: requestedFit,
      renderFit: requestedFit === 'auto' ? 'cover' : requestedFit,
      focus: photoFocusInput.value,
      size,
      ratio: previewImageRatio ? Number(previewImageRatio.toFixed(4)) : null,
    };
  }

  function createDraft() {
    const section = sectionInput.value;
    const language = languageInput.value;
    const slug = slugInput.value.trim() || 'new-entry';
    const title = titleInput.value.trim();
    const selectedFiles = Array.from(imagesInput.files ?? []);

    return {
      schema: 'personal-index.entry.v1',
      status: 'draft',
      section,
      language,
      slug,
      title,
      lead: leadInput.value.trim(),
      body: bodyInput.value.trim(),
      paths: {
        content: `content/${section}/${slug}.${language}.json`,
        publicUrl: `/${section}/${slug}/`,
        uploads: `content/uploads/${section}/${slug}/`,
      },
      photos: selectedFiles.map((file, index) => ({
        originalName: file.name,
        targetName: `${String(index + 1).padStart(2, '0')}-${file.name}`,
        role: index === 0 ? 'cover' : 'gallery',
        ...getEffectivePhotoSettings(),
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  function updateDraftJson() {
    currentDraft = createDraft();

    if (draftJsonOutput) {
      draftJsonOutput.value = JSON.stringify(currentDraft, null, 2);
    }
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
    updatePhotoSettings();
    updateDraftJson();
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

      const probe = new Image();
      probe.onload = () => {
        previewImageRatio = probe.naturalWidth / probe.naturalHeight;
        updatePhotoSettings();
        URL.revokeObjectURL(probe.src);
      };
      probe.src = URL.createObjectURL(file);
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

    previewImageRatio = null;

    renderPreviewImage();
    updatePreview();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateDraftJson();
    setStatus('Статус: JSON черновика готов. Следующий этап — отправлять его и фото в GitHub автоматически.');
  });

  copyJsonButton?.addEventListener('click', async () => {
    updateDraftJson();

    try {
      await navigator.clipboard.writeText(JSON.stringify(currentDraft, null, 2));
      setStatus('Статус: JSON скопирован.');
    } catch {
      draftJsonOutput?.select();
      setStatus('Статус: выделил JSON, можно скопировать вручную.');
    }
  });

  downloadJsonButton?.addEventListener('click', () => {
    updateDraftJson();

    const blob = new Blob([JSON.stringify(currentDraft, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `${currentDraft.slug || 'entry'}.${currentDraft.language || 'ru'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('Статус: JSON скачан.');
  });

  updatePreview();
}

initAdminPrototype();
