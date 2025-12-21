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

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const main = async () => {
  const contentElement = document.querySelector('.note__content');
  const closeButton = document.querySelector('.note__close');
  const statusElement = document.querySelector('[data-status]');

  const actionButtons = {
    new: document.querySelector('[data-action="new"]')
  };

  const noteId = getNoteIdFromQuery();
  if (!noteId) {
    statusElement.textContent = 'Missing note id';
    return;
  }

  const noteData = await safeApiCall(
    () => window.stickyAPI.loadNote(noteId),
    { ok: false, noteId, content: '' }
  );

  const stickyNote = setupStickyNote({
    contentElement,
    closeButton,
    actionButtons,
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
    onDelete: async () => {
      const response = await safeApiCall(
        () => window.stickyAPI.deleteNote(noteId),
        { ok: false, error: 'Unable to delete note.' }
      );

      if (!response.ok) {
        statusElement.textContent = response.error || 'Delete canceled';
      }
    }
  });

  if (noteData.ok) {
    stickyNote.setContent(noteData.content || '');
  }

  const taskPanel = document.querySelector('[data-task-panel]');
  const taskPanelOverlay = document.querySelector('[data-overlay]');
  const taskPanelLoading = document.querySelector('[data-loading]');
  const taskPanelEmpty = document.querySelector('[data-empty]');
  const taskPanelList = document.querySelector('[data-task-list]');

  const toggleTaskPanel = (show) => {
    if (show) {
      taskPanel.classList.add('is-open');
      taskPanelOverlay.style.display = 'block';
      setTimeout(() => taskPanelOverlay.classList.add('is-visible'), 10);
      loadAllTasks();
    } else {
      taskPanel.classList.remove('is-open');
      taskPanelOverlay.classList.remove('is-visible');
      setTimeout(() => {
        taskPanelOverlay.style.display = 'none';
      }, 300);
    }
  };

  const renderTaskList = (allTasks) => {
    const tasksByNote = {};

    allTasks.forEach((task) => {
      if (!tasksByNote[task.noteId]) {
        tasksByNote[task.noteId] = {
          notePreview: task.notePreview || 'Untitled Note',
          tasks: []
        };
      }
      tasksByNote[task.noteId].tasks.push(task);
    });

    taskPanelList.innerHTML = '';

    Object.entries(tasksByNote).forEach(([noteIdForTask, data]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'task-group';

      const headerEl = document.createElement('div');
      headerEl.className = 'task-group__header';
      headerEl.innerHTML = `
        <span class="task-group__note">${escapeHtml(data.notePreview)}</span>
        <span class="task-group__count">${data.tasks.length}</span>
      `;

      groupEl.appendChild(headerEl);

      data.tasks.forEach((task) => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item ${task.completed ? 'task-item--completed' : ''}`;
        taskEl.innerHTML = `
          <input
            type="checkbox"
            class="task-item__checkbox"
            ${task.completed ? 'checked' : ''}
            data-note-id="${noteIdForTask}"
            data-task-index="${task.taskIndex}"
          />
          <span class="task-item__text">${escapeHtml(task.text)}</span>
        `;

        groupEl.appendChild(taskEl);
      });

      taskPanelList.appendChild(groupEl);
    });

    taskPanelList.querySelectorAll('.task-item__checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', async (event) => {
        const { noteId: checkboxNoteId, taskIndex } = event.target.dataset;
        const completed = event.target.checked;

        const response = await safeApiCall(
          () =>
            window.stickyAPI.toggleTask({
              noteId: checkboxNoteId,
              taskIndex: Number(taskIndex),
              completed
            }),
          { ok: false }
        );

        if (!response.ok) {
          event.target.checked = !completed;
          return;
        }

        const taskItem = event.target.closest('.task-item');
        if (taskItem) {
          taskItem.classList.toggle('task-item--completed', completed);
        }
      });
    });
  };

  const loadAllTasks = async () => {
    taskPanelLoading.style.display = 'flex';
    taskPanelEmpty.style.display = 'none';
    taskPanelList.style.display = 'none';

    const result = await safeApiCall(() => window.stickyAPI.getAllTasks(), { ok: false });
    const tasks = result.ok ? result.tasks : [];

    if (!tasks || tasks.length === 0) {
      taskPanelLoading.style.display = 'none';
      taskPanelEmpty.style.display = 'flex';
      return;
    }

    renderTaskList(tasks);
    taskPanelLoading.style.display = 'none';
    taskPanelList.style.display = 'block';
  };

  document.querySelector('[data-action="tasks"]').addEventListener('click', () => {
    toggleTaskPanel(true);
  });

  document
    .querySelector('[data-action="close-panel"]')
    .addEventListener('click', () => toggleTaskPanel(false));

  taskPanelOverlay.addEventListener('click', () => {
    toggleTaskPanel(false);
  });

  document
    .querySelector('[data-action="ai-analyze-all"]')
    .addEventListener('click', () => {
      statusElement.textContent = 'AI analysis coming in Phase 3';
    });
};

window.addEventListener('DOMContentLoaded', main);
