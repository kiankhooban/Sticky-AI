const path = require('path');
const Store = require('electron-store');

const DEFAULT_NOTE_ID = 'default-note';

const storePath = process.env.STICKY_AI_STORE_PATH;
const resolvedStorePath = storePath ? path.resolve(process.cwd(), storePath) : undefined;

const store = new Store({
  name: 'sticky-ai',
  ...(resolvedStorePath ? { cwd: resolvedStorePath } : {}),
  schema: {
    notes: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          tasks: {
            type: 'array',
            default: [],
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                completed: { type: 'boolean' },
                aiGenerated: { type: 'boolean' }
              }
            }
          },
          bounds: {
            type: ['object', 'null'],
            default: null,
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' }
            }
          },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' }
        }
      }
    },
    aiSettings: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' }
      }
    }
  }
});

const getAllNotes = () => {
  return store.get('notes', []);
};

const getNoteById = (noteId) => {
  const notes = getAllNotes();
  return notes.find((note) => note.id === noteId);
};

const upsertNote = (note) => {
  const notes = getAllNotes();
  const index = notes.findIndex((entry) => entry.id === note.id);

  if (index >= 0) {
    notes[index] = note;
  } else {
    notes.push(note);
  }

  store.set('notes', notes);
  return note;
};

const getOrCreateDefaultNote = () => {
  const existing = getNoteById(DEFAULT_NOTE_ID);
  if (existing) {
    return existing;
  }

  const timestamp = Date.now();
  const note = {
    id: DEFAULT_NOTE_ID,
    content: '',
    tasks: [],
    bounds: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return upsertNote(note);
};

module.exports = {
  DEFAULT_NOTE_ID,
  getAllNotes,
  getNoteById,
  getOrCreateDefaultNote,
  upsertNote
};
