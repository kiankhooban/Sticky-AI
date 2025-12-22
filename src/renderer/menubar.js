const tasksSection = document.querySelector('[data-tasks-section]');
const emptyState = document.querySelector('[data-empty]');
const countElement = document.querySelector('[data-count]');

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const loadTasks = async () => {
  try {
    const response = await window.stickyAPI.getAllTasks();
    const allTasks = response?.tasks || response || [];
    const taskCount = allTasks ? allTasks.length : 0;
    countElement.textContent = taskCount;

    const existingTasks = tasksSection.querySelectorAll('.menubar-dropdown__item--task');
    existingTasks.forEach((task) => task.remove());

    if (!allTasks || allTasks.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';

    allTasks.forEach((task) => {
      const taskItem = document.createElement('div');
      taskItem.className = 'menubar-dropdown__item menubar-dropdown__item--task';
      taskItem.dataset.noteId = task.noteId;
      taskItem.dataset.taskIndex = task.taskIndex;

      const checkmark = document.createElement('span');
      checkmark.className = 'menubar-dropdown__check';
      checkmark.textContent = task.completed ? '✓' : '';

      const text = document.createElement('span');
      text.className = 'menubar-dropdown__text';
      text.textContent = escapeHtml(task.text);

      taskItem.appendChild(checkmark);
      taskItem.appendChild(text);

      taskItem.addEventListener('click', async () => {
        try {
          const newState = !task.completed;
          checkmark.textContent = newState ? '✓' : '';
          task.completed = newState;

          const result = await window.stickyAPI.toggleTask({
            noteId: task.noteId,
            taskIndex: task.taskIndex,
            completed: newState
          });

          if (!result || !result.ok) {
            checkmark.textContent = task.completed ? '' : '✓';
            task.completed = !newState;
            console.error('Failed to toggle task');
          }
        } catch (error) {
          console.error('Error toggling task:', error);
          checkmark.textContent = task.completed ? '' : '✓';
          task.completed = !task.completed;
        }
      });

      tasksSection.insertBefore(taskItem, emptyState);
    });
  } catch (error) {
    console.error('Failed to load tasks:', error);
    emptyState.style.display = 'flex';
    countElement.textContent = '0';
  }
};

const setupActions = () => {
  document.querySelector('[data-action="show-all"]').addEventListener('click', async () => {
    try {
      await window.stickyAPI.showAllNotes();
      window.close();
    } catch (error) {
      console.error('Failed to show all notes:', error);
    }
  });

  document.querySelector('[data-action="new"]').addEventListener('click', async () => {
    try {
      await window.stickyAPI.createNote();
      window.close();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  });

  document.querySelector('[data-action="quit"]').addEventListener('click', () => {
    window.stickyAPI.quitApp();
  });
};

const init = () => {
  loadTasks();
  setupActions();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('focus', () => {
  loadTasks();
});
