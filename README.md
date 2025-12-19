# Sticky AI

macOS-native sticky notes with AI-ready task detection, menu bar integration, and a modern, Perplexity-inspired dual-font aesthetic.

## Prerequisites
- Node.js 20+ (required for latest dependencies)
- npm 9+

## Installation
```bash
npm install
```

## Run
```bash
npm start
```

## Development (hot reload)
```bash
npm run dev
```

## Project structure
```
sticky-notes-ai/
├── package.json
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── README.md
├── src/
│   ├── main.js
│   ├── preload.js
│   ├── menu-bar.js
│   ├── store.js
│   └── renderer/
│       ├── index.html
│       ├── styles.css
│       ├── renderer.js
│       └── components/
│           ├── sticky-note.js
│           └── task-item.js
├── assets/
│   ├── icons/
│   │   ├── menubar-icon.png
│   │   └── app-icon.png
│   └── fonts/
│       ├── Inter/
│       └── JetBrainsMono/
└── build/
```

Note: the icon files are minimal placeholders. Replace them with production assets.

## Keyboard shortcuts
- Cmd+N: Create new note (placeholder for Phase 2)

## Roadmap
- Multiple sticky notes with unified task list
- Menu bar dropdown with tasks
- AI task detection and analysis (Gemini integration)
- Task completion syncing and badges

## Contributing
1. Fork the repo and create a feature branch.
2. Keep changes focused and include notes in PR descriptions.
3. Run `npm run lint` before submitting.
