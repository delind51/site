# Project structure

This is a static site. Most pages are named `index.html` on purpose: that keeps URLs clean, for example `/places/`, `/places/cologne/`, `/projects/experiments/`.

## Main files

- `index.html` — Russian home page.
- `en/index.html` — English home page.
- `styles.css` — all visual styling, organized by numbered sections.
- `script.js` — small behavior layer and the central `entryRegistry` list for previous / next navigation.
- `server.js` — optional local Node server.

## Routes

```text
/
├── places/
│   ├── cologne/
│   └── thasos/
├── frequency/
│   ├── current-rotation/
│   └── albums/
├── objects/
│   ├── sneakers/
│   └── clothing/
└── projects/
    ├── applications/
    └── experiments/

/en/
├── places/
│   ├── cologne/
│   └── thasos/
├── frequency/
│   ├── current-rotation/
│   └── albums/
├── objects/
│   ├── sneakers/
│   └── clothing/
└── projects/
    ├── applications/
    └── experiments/
```

## Adding a new entry

1. Copy an existing entry folder, for example `places/cologne/`.
2. Rename the folder slug.
3. Update the page title, hero copy, metadata and language links.
4. Add the new slug and title to `entryRegistry` in `script.js`.
5. Add the same entry in the matching English section.

The previous / next pager is generated from `entryRegistry` when JavaScript is enabled. The static HTML pager can stay as fallback.
