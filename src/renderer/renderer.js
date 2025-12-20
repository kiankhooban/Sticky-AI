import { setupStickyNote } from './components/sticky-note.js';

const safeApiCall = async (fn, fallback) => {
  try {
    return await fn();
  } catch (error) {
    console.error(error);
    return fallback;
  }
};

const getNoteIdFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('noteId');
};

const main = async () => {
  const contentElement = document.querySelector('.note__content');
  const closeButton = document.querySelector('.note__close');
  const taskCountElement = document.querySelector('[data-task-count]');
  const statusElement = document.querySelector('[data-status]');

  const actionButtons = {
    new: document.querySelector('[data-action="new"]'),
    analyze: document.querySelector('[data-action="analyze"]')
  };

  const noteId = getNoteIdFromQuery();
  if (!noteId) {
    statusElement.textContent = 'Missing note id';
    return;
  }

  const noteData = await safeApiCall(
    () => window.stickyAPI.loadNote(noteId),
    { ok: false, noteId, content: '', tasks: [] }
  );

  let tasks = Array.isArray(noteData.tasks) ? noteData.tasks : [];

  const stickyNote = setupStickyNote({
    contentElement,
    closeButton,
    actionButtons,
    taskCountElement,
    statusElement,
    onSave: async ({ content }) => {
      const response = await safeApiCall(
        () => window.stickyAPI.saveNote({ noteId, content }),
        { ok: false }
      );
      return response;
    },
    onNewNote: async () => {
      const response = await safeApiCall(
        () => window.stickyAPI.createNote(),
        { ok: false, error: 'Unable to create note.' }
      );

      if (!response.ok) {
        statusElement.textContent = response.error || 'New note unavailable';
      }
    },
    onAnalyze: () => {
      statusElement.textContent = 'AI analysis coming soon';
    }
  });

  if (noteData.ok) {
    stickyNote.setContent(noteData.content || '');
  }
  stickyNote.setTasks(tasks);

  window.stickyAPI.onTasksSync((payload) => {
    if (!payload || payload.noteId !== noteId) {
      return;
    }
    tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    stickyNote.setTasks(tasks);
  });

  window.stickyAPI.onTaskUpdated((payload) => {
    if (!payload || payload.noteId !== noteId) {
      return;
    }
    if (!tasks[payload.taskIndex]) {
      return;
    }
    tasks[payload.taskIndex].completed = payload.completed;
    stickyNote.setTasks(tasks);
  });
};

window.addEventListener('DOMContentLoaded', main);
