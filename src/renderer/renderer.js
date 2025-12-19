import { setupStickyNote } from './components/sticky-note.js';

const safeApiCall = async (fn, fallback) => {
  try {
    return await fn();
  } catch (error) {
    console.error(error);
    return fallback;
  }
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

  const noteData = await safeApiCall(
    () => window.stickyAPI.loadNote(),
    { noteId: 'default-note', content: '', tasks: [] }
  );

  let noteId = noteData.noteId;
  let tasks = Array.isArray(noteData.tasks) ? noteData.tasks : [];

  const stickyNote = setupStickyNote({
    contentElement,
    closeButton,
    actionButtons,
    taskCountElement,
    statusElement,
    onSave: async ({ content }) => {
      const response = await safeApiCall(
        () => window.stickyAPI.saveNote({ noteId, content, tasks }),
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

  stickyNote.setContent(noteData.content || '');
  stickyNote.setTasks(tasks);
};

window.addEventListener('DOMContentLoaded', main);
