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
  const photoNote = document.querySelector('[data-photo-note]');
  const photoList = document.querySelector('[data-photo-list]');
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

  let photos = [];
  let currentDraft = {};

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function getCoverPhoto() {
    return photos.find((photo) => photo.role === 'cover') ?? photos[0] ?? null;
  }

  function getAutoPhotoSize(photo) {
    if (!photo?.ratio) {
      return 'normal';
    }

    if (photo.ratio > 1.25) {
      return 'wide';
    }

    if (photo.ratio < 0.85) {
      return 'tall';
    }

    return 'square';
  }

  function getEffectivePhotoSettings(photo) {
    const requestedFit = photo?.fit ?? 'auto';
    const size = photo?.size === 'normal' ? getAutoPhotoSize(photo) : photo?.size ?? 'normal';

    return {
      fit: requestedFit,
      renderFit: requestedFit === 'auto' ? 'cover' : requestedFit,
      focus: photo?.focus ?? 'center',
      size,
      ratio: photo?.ratio ? Number(photo.ratio.toFixed(4)) : null,
    };
  }

  function renderPreviewImage() {
    if (!previewMedia) {
      return;
    }

    previewMedia.innerHTML = '';
    const coverPhoto = getCoverPhoto();

    if (coverPhoto) {
      const settings = getEffectivePhotoSettings(coverPhoto);
      const image = document.createElement('img');
      image.src = coverPhoto.url;
      image.alt = titleInput.value || 'Preview image';
      previewMedia.dataset.fit = settings.renderFit;
      previewMedia.dataset.focus = settings.focus;
      previewMedia.dataset.size = settings.size;
      previewMedia.append(image);
      return;
    }

    const placeholder = document.createElement('span');
    placeholder.textContent = 'PHOTO / 16:10';
    previewMedia.append(placeholder);
  }

  function updatePhotoNote() {
    if (photoNote) {
      photoNote.textContent = photos.length
        ? `Выбрано фото: ${photos.length}. Первое cover-фото показывается в preview.`
        : 'Выбери фото — для каждой появятся отдельные настройки кадра.';
    }
  }

  function setPhotoValue(id, key, value) {
    photos = photos.map((photo) => {
      if (key === 'role' && value === 'cover') {
        return { ...photo, role: photo.id === id ? 'cover' : 'gallery' };
      }

      return photo.id === id ? { ...photo, [key]: value } : photo;
    });
    renderPhotoList();
    renderPreviewImage();
    updatePreview();
  }

  function removePhoto(id) {
    const photo = photos.find((item) => item.id === id);

    if (photo) {
      URL.revokeObjectURL(photo.url);
    }

    photos = photos.filter((item) => item.id !== id);

    if (photos.length && !photos.some((item) => item.role === 'cover')) {
      photos[0].role = 'cover';
    }

    renderPhotoList();
    renderPreviewImage();
    updatePreview();
  }

  function createOption(value, label, selectedValue) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === selectedValue;
    return option;
  }

  function createPhotoSelect(photo, key, options) {
    const field = document.createElement('div');
    const label = document.createElement('label');
    const select = document.createElement('select');

    field.className = 'admin-field';
    label.textContent = key === 'role' ? 'Роль' : key === 'fit' ? 'Кадр' : key === 'focus' ? 'Фокус' : 'Размер';
    select.append(...options.map(([value, labelText]) => createOption(value, labelText, photo[key])));
    select.addEventListener('change', () => setPhotoValue(photo.id, key, select.value));
    field.append(label, select);
    return field;
  }

  function renderPhotoList() {
    if (!photoList) {
      return;
    }

    photoList.innerHTML = '';

    if (!photos.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'Фото пока не выбраны.';
      photoList.append(empty);
      updatePhotoNote();
      return;
    }

    for (const photo of photos) {
      const item = document.createElement('article');
      const thumb = document.createElement('div');
      const image = document.createElement('img');
      const body = document.createElement('div');
      const meta = document.createElement('p');
      const grid = document.createElement('div');
      const remove = document.createElement('button');

      item.className = 'admin-photo-item';
      thumb.className = 'admin-photo-thumb';
      body.className = 'admin-photo-item-body';
      meta.className = 'admin-photo-item-meta';
      grid.className = 'admin-photo-grid';
      remove.className = 'admin-photo-remove';
      remove.type = 'button';

      image.src = photo.url;
      image.alt = photo.file.name;
      meta.textContent = `${photo.file.name} / ${photo.ratio ? photo.ratio.toFixed(2) : 'ratio pending'}`;
      remove.textContent = 'Удалить';
      remove.addEventListener('click', () => removePhoto(photo.id));

      grid.append(
        createPhotoSelect(photo, 'role', [['cover', 'Cover'], ['gallery', 'Gallery']]),
        createPhotoSelect(photo, 'fit', [['auto', 'Auto'], ['cover', 'Cover'], ['contain', 'Contain']]),
        createPhotoSelect(photo, 'focus', [['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']]),
        createPhotoSelect(photo, 'size', [['normal', 'Auto size'], ['wide', 'Wide'], ['tall', 'Tall'], ['square', 'Square']]),
      );

      thumb.append(image);
      body.append(meta, grid, remove);
      item.append(thumb, body);
      photoList.append(item);
    }

    updatePhotoNote();
  }

  function createDraft() {
    const section = sectionInput.value;
    const language = languageInput.value;
    const slug = slugInput.value.trim() || 'new-entry';
    const title = titleInput.value.trim();
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
      photos: photos.map((photo, index) => ({
        originalName: photo.file.name,
        targetName: `${String(index + 1).padStart(2, '0')}-${photo.file.name}`,
        role: photo.role,
        ...getEffectivePhotoSettings(photo),
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function createPublishPayload() {
    const draft = createDraft();
    const photoPayload = await Promise.all(photos.map(async (photo, index) => ({
      ...draft.photos[index],
      dataUrl: await readFileAsDataUrl(photo.file),
    })));

    return {
      ...draft,
      photos: photoPayload,
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
    renderPreviewImage();
    updateDraftJson();
    setStatus(`Статус: черновик не сохранён. Будущий адрес: /${sectionInput.value}/${slug}/`);
  }

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  imagesInput.addEventListener('change', () => {
    for (const file of Array.from(imagesInput.files ?? [])) {
      const photo = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        role: photos.length === 0 ? 'cover' : 'gallery',
        fit: 'auto',
        focus: 'center',
        size: 'normal',
        ratio: null,
      };

      photos.push(photo);
      const probe = new Image();
      probe.onload = () => {
        photo.ratio = probe.naturalWidth / probe.naturalHeight;
        renderPhotoList();
        renderPreviewImage();
        updateDraftJson();
        URL.revokeObjectURL(probe.src);
      };
      probe.src = URL.createObjectURL(file);
    }

    imagesInput.value = '';
    setStatus(`Статус: выбрано фото: ${photos.length}. Настройки можно менять поштучно.`);
    renderPhotoList();
    renderPreviewImage();
    updatePreview();
  });

  resetButton?.addEventListener('click', () => {
    form.reset();

    for (const photo of photos) {
      URL.revokeObjectURL(photo.url);
    }

    photos = [];

    renderPhotoList();
    renderPreviewImage();
    updatePreview();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      setStatus('Статус: публикация работает в локальной админке на localhost. GitHub Pages показывает сайт, но не запускает backend.');
      return;
    }

    if (!titleInput.value.trim() || !slugInput.value.trim()) {
      setStatus('Статус: нужно заполнить название и адрес страницы.');
      return;
    }

    try {
      setStatus('Статус: публикую локально…');
      const payload = await createPublishPayload();
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Publish failed');
      }

      setStatus(`Статус: опубликовано. Открыть: ${result.result.url}`);
      window.open(result.result.url, '_blank');
    } catch (error) {
      setStatus(`Статус: ошибка публикации — ${error.message}`);
    }
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
  renderPhotoList();
}

initAdminPrototype();
