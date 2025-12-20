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
  const updatedNotes = notes.filter((note) => note.id !== noteId);
  return safeSetNotes(updatedNotes);
};

/**
 * @param {number} limit
 * @returns {Array}
 */
const getRecentNotes = (limit) => {
  return getAllNotes().slice(0, limit);
};

const normalizeLineEndings = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\r\n|\r/g, '\n');
};

/**
 * @param {string} content
 * @returns {Array}
 */
const detectTasks = (content) => {
  try {
    const lines = normalizeLineEndings(content).split('\n');
    const tasks = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const checkboxMatch = trimmed.match(/^\[([x\s])\]\s*(.+)/i);
      if (checkboxMatch) {
        tasks.push({
          text: checkboxMatch[2].trim(),
          completed: checkboxMatch[1].toLowerCase() === 'x',
          aiGenerated: false
        });
        return;
      }

      if (/^[-*•]\s+.+/.test(trimmed)) {
        tasks.push({
          text: trimmed.replace(/^[-*•]\s+/, '').trim(),
          completed: false,
          aiGenerated: false
        });
        return;
      }

      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
      if (numberedMatch) {
        tasks.push({
          text: numberedMatch[1].trim(),
          completed: false,
          aiGenerated: false
        });
      }
    });

    return tasks;
  } catch (error) {
    console.error('Failed to detect tasks:', error);
    return [];
  }
};

const mergeTaskCompletion = (existingTasks, detectedTasks) => {
  const existingMap = new Map();
  existingTasks.forEach((task) => {
    existingMap.set(task.text.toLowerCase(), task.completed);
  });

  return detectedTasks.map((task) => ({
    ...task,
    completed: existingMap.has(task.text.toLowerCase())
      ? existingMap.get(task.text.toLowerCase())
      : task.completed
  }));
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

  const detected = detectTasks(content);
  const tasks = mergeTaskCompletion(note.tasks || [], detected);

  const updatedNote = {
    ...note,
    content: typeof content === 'string' ? content : note.content,
    tasks,
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
 * @param {string} noteId
 * @param {number} taskIndex
 * @param {boolean | undefined} completed
 * @returns {object | null}
 */
const toggleTask = (noteId, taskIndex, completed) => {
  const note = getNoteById(noteId);
  if (!note || !note.tasks || !note.tasks[taskIndex]) {
    return null;
  }

  const task = note.tasks[taskIndex];
  task.completed = typeof completed === 'boolean' ? completed : !task.completed;

  const updatedNote = {
    ...note,
    tasks: [...note.tasks],
    updatedAt: Date.now()
  };

  upsertNote(updatedNote);
  return task;
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
          notePreview: (note.content || '').replace(/\n/g, ' ').slice(0, 50)
        });
      });
    }
  });

  return allTasks;
};

module.exports = {
  createNote,
  deleteNote,
  detectTasks,
  getAllNotes,
  getAllTasks,
  getNoteById,
  getRecentNotes,
  saveNoteContent,
  toggleTask,
  updateNote
};
