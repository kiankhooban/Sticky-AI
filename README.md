# Sticky AI

macOS-native sticky notes with AI-powered task detection, menu bar integration, and a modern Apple-inspired liquid glass UI aesthetic.

## Prerequisites
- Node.js 20+ (required for latest dependencies)
- npm 9+
- Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Sticky-AI.git
cd Sticky-AI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Run
```bash
npm start
```

## Development (hot reload)
```bash
npm run dev
```

## Features

### ✨ AI-Powered Task Detection
- **Automatic Analysis**: Sticky notes are analyzed by Google Gemini AI whenever content changes
- **Smart Task Extraction**: AI detects tasks, deadlines, and action items from natural language
- **Task Metadata**: Each AI-generated task includes:
  - Priority level (high/medium/low) with colored indicators
  - Estimated time in minutes
  - AI reasoning explaining why it was detected as a task
- **Manual Analysis**: Use "Analyze All Notes" button to batch process all notes

### 🎨 Apple-Inspired UI
- **Liquid Glass Effect**: Translucent windows with backdrop blur (80px) and saturation
- **Light/Dark Mode**: Automatic theme switching based on system preferences
- **Native macOS Menu Bar**: Dropdown styled exactly like macOS WiFi/Battery menus
- **SF Pro Text Font**: System-native typography throughout

### 📝 Sticky Notes
- Create multiple notes with persistent positioning
- Auto-save on content changes
- Delete protection (minimum 1 note required)
- Resizable and draggable windows

### ✅ Task Management
- Unified task panel showing tasks from all notes
- Checkbox completion tracking
- Task grouping by note
- Visual indicators for AI-generated tasks (✨ sparkle icon)

## Project structure
```
Sticky-AI/
├── package.json
├── .gitignore
├── .env.example
├── README.md
├── src/
│   ├── main.js           # Main process & IPC handlers
│   ├── preload.js        # IPC bridge to renderer
│   ├── menu-bar.js       # Tray icon & menu dropdown
│   ├── store.js          # Electron-store data persistence
│   ├── window-manager.js # Window lifecycle management
│   ├── ai/
│   │   ├── gemini.js     # Google Gemini API client
│   │   ├── task-parser.js # Task validation & merging
│   │   └── analyzer.js   # Orchestrates AI analysis
│   └── renderer/
│       ├── index.html
│       ├── menubar.html
│       ├── styles.css     # Sticky note styles
│       ├── menubar.css    # Menu bar dropdown styles
│       ├── renderer.js    # Sticky note logic
│       ├── menubar.js     # Menu bar logic
│       └── components/
│           ├── sticky-note.js
│           └── task-item.js
└── assets/
    ├── images/
    │   ├── title-logo.svg
    │   └── menubar-logo.svg
    └── fonts/
        ├── offbit/
        └── Wagon Free Personal Use/
```
## AI Integration Details

### How It Works
1. **Content Change Detection**: When you edit a sticky note, the app detects if the content actually changed
2. **Background Analysis**: Changed content is sent to Gemini AI with a 500ms delay to avoid blocking the save
3. **Task Parsing**: AI response is validated and merged with existing tasks
4. **Smart Merging**: Duplicate tasks are prevented, existing tasks are preserved
5. **UI Updates**: All windows are notified to refresh task displays

### Gemini Prompt
The AI uses a structured prompt that:
- Extracts actionable tasks and deadlines
- Assigns priority levels based on urgency
- Estimates time required in minutes
- Provides reasoning for each detected task
- Returns JSON for programmatic parsing

### Rate Limiting
- Single note analysis: Immediate
- Batch analysis: 100ms delay between notes
- Failed analyses are logged but don't block the UI

## API Configuration

The app uses Google Gemini 1.5 Flash model via REST API:
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Authentication**: API key in query parameter
- **Timeout**: 30 seconds per request
- **Error Handling**: Graceful fallbacks with user feedback

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for task detection |

Get your API key:
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy key to `.env` file

## Keyboard shortcuts
- Cmd+N: Create new note (placeholder for Phase 2)

## Contributing
1. Fork the repo and create a feature branch.
2. Keep changes focused and include notes in PR descriptions.
3. Run `npm run lint` before submitting.

## License
MIT

## Troubleshooting

### AI Analysis Not Working
- Verify `.env` file exists in project root
- Check that `GEMINI_API_KEY` is set correctly
- Restart the app after changing `.env`
- Check Console for API error messages

### Tasks Not Appearing
- Ensure note content has changed (whitespace-only changes don't trigger AI)
- Wait 2-3 seconds after saving for analysis to complete
- Check that note content contains actionable language (verbs like "do", "call", "send")
- Open task panel to see all detected tasks

### Menu Bar Icon Not Visible
- Restart the app completely (Cmd+Q then relaunch)
- Check macOS menu bar settings aren't hiding the icon
- Try toggling light/dark mode (icon uses template mode)

## Security

### API Key Safety
- **Never commit your `.env` file** - It's already in `.gitignore`
- **Never share your API key** publicly or in screenshots
- **Use `.env.example`** as a template for setting up environment variables
- **Regenerate your API key** immediately if it's accidentally exposed

### Recommended API Key Restrictions
To enhance security, restrict your Gemini API key in Google Cloud Console:
1. Visit https://makersuite.google.com/app/apikey
2. Select your API key and click "Edit"
3. Set the following restrictions:
   - **Application restrictions**: HTTP referrers (if applicable)
   - **API restrictions**: Limit to Google Generative Language API only
   - **Quota limits**: Set reasonable daily usage limits

### Check for Exposed Credentials
If you suspect your API key was committed to git history:
```bash
# Check if .env was ever committed
git log --all --full-history -- .env

# If found, regenerate your API key immediately at:
# https://makersuite.google.com/app/apikey
```
