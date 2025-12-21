const crypto = require('crypto');
const path = require('path');
const Store = require('electron-store');

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

const safeGetNotes = () => {
  try {
    return store.get('notes', []);
  } catch (error) {
    console.error('Failed to read notes from store:', error);
    return [];
  }
};

const safeSetNotes = (notes) => {
  try {
    store.set('notes', notes);
    return true;
  } catch (error) {
    console.error('Failed to write notes to store:', error);
    return false;
  }
};

const generateNoteId = () => {
  return `note-${crypto.randomUUID()}`;
};

/**
 * @returns {Array}
 */
const getAllNotes = () => {
  const notes = safeGetNotes();
  return notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

/**
 * @param {string} noteId
 * @returns {object | undefined}
 */
const getNoteById = (noteId) => {
  const notes = safeGetNotes();
  return notes.find((note) => note.id === noteId);
};

/**
 * @param {object} note
 * @returns {object}
 */
const upsertNote = (note) => {
  const notes = safeGetNotes();
  const index = notes.findIndex((entry) => entry.id === note.id);

  if (index >= 0) {
    notes[index] = note;
  } else {
    notes.push(note);
  }

  safeSetNotes(notes);
  return note;
};

/**
 * @returns {object}
 */
const createNote = () => {
  const timestamp = Date.now();
  const note = {
    id: generateNoteId(),
    content: '',
    tasks: [],
    bounds: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return upsertNote(note);
};

/**
 * @param {string} noteId
 * @returns {boolean}
 */
const deleteNote = (noteId) => {
  const notes = safeGetNotes();
  const filtered = notes.filter((note) => note.id !== noteId);

  if (filtered.length === 0) {
    throw new Error('Cannot delete the last note');
  }

  return safeSetNotes(filtered);
};

/**
 * @param {number} limit
 * @returns {Array}
 */
const getRecentNotes = (limit) => {
  return getAllNotes().slice(0, limit);
};

/**
 * @param {string} noteId
 * @param {string} content
 * @param {object | null} bounds
 * @returns {{ ok: boolean, note?: object, error?: string }}
 */
const saveNoteContent = (noteId, content, bounds) => {
  const note = getNoteById(noteId);
  if (!note) {
    return { ok: false, error: 'Note not found.' };
  }

  const updatedNote = {
    ...note,
    content: typeof content === 'string' ? content : note.content,
    tasks: Array.isArray(note.tasks) ? note.tasks : [],
    bounds: bounds || note.bounds,
    updatedAt: Date.now()
  };

  upsertNote(updatedNote);
  return { ok: true, note: updatedNote };
};

/**
 * @param {string} noteId
 * @param {object} updates
 * @returns {{ ok: boolean, note?: object, error?: string }}
 */
const updateNote = (noteId, updates) => {
  const note = getNoteById(noteId);
  if (!note) {
    return { ok: false, error: 'Note not found.' };
  }

  const updatedNote = {
    ...note,
    ...updates,
    updatedAt: Date.now()
  };

  upsertNote(updatedNote);
  return { ok: true, note: updatedNote };
};

/**
 * @returns {Array}
 */
const getAllTasks = () => {
  const notes = getAllNotes();
  const allTasks = [];

  notes.forEach((note) => {
    if (note.tasks && note.tasks.length > 0) {
      note.tasks.forEach((task, index) => {
        allTasks.push({
          ...task,
          noteId: note.id,
          taskIndex: index,
          notePreview: note.content ? note.content.substring(0, 50).trim() : 'Empty Note'
        });
      });
    }
  });

  return allTasks;
};

/**
 * @param {string} noteId
 * @param {number} taskIndex
 * @param {boolean} completed
 * @returns {object}
 */
const toggleTask = (noteId, taskIndex, completed) => {
  const note = getNoteById(noteId);
  if (!note || !note.tasks || !note.tasks[taskIndex]) {
    throw new Error('Task not found');
  }

  note.tasks[taskIndex].completed = completed;
  note.updatedAt = Date.now();

  upsertNote(note);
  return note.tasks[taskIndex];
};

module.exports = {
  createNote,
  deleteNote,
  getAllNotes,
  getAllTasks,
  getNoteById,
  getRecentNotes,
  saveNoteContent,
  toggleTask,
  updateNote
};
