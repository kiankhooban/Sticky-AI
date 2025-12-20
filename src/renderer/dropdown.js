const taskList = document.querySelector('[data-task-list]');
const taskCount = document.querySelector('[data-task-count]');
const openAllButton = document.querySelector('[data-open-all]');
const quitButton = document.querySelector('[data-quit]');

const renderTasks = (tasks) => {
  taskList.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dropdown__empty';
    empty.textContent = 'No tasks detected yet.';
    taskList.appendChild(empty);
    taskCount.textContent = '0 tasks';
    return;
  }

  const grouped = tasks.reduce((acc, task) => {
    const key = task.noteId;
    if (!acc[key]) {
      acc[key] = {
        notePreview: task.notePreview || 'Untitled note',
        tasks: []
      };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([noteId, group]) => {
    const groupElement = document.createElement('div');
    groupElement.className = 'task-group';

    const header = document.createElement('div');
    header.className = 'task-group__header';
    const noteLabel = document.createElement('span');
    noteLabel.className = 'task-group__note';
    noteLabel.textContent = group.notePreview;
    header.appendChild(noteLabel);
    groupElement.appendChild(header);

    group.tasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = `task-item${task.completed ? ' task-item--completed' : ''}`;
      item.dataset.noteId = noteId;
      item.dataset.taskIndex = task.taskIndex;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-item__checkbox';
      checkbox.checked = task.completed;

      const text = document.createElement('span');
      text.className = 'task-item__text';
      text.textContent = task.text;

      checkbox.addEventListener('change', async () => {
        await window.stickyAPI.toggleTask({
          noteId,
          taskIndex: task.taskIndex,
          completed: checkbox.checked
        });
      });

      item.appendChild(checkbox);
      item.appendChild(text);
      groupElement.appendChild(item);
    });

    taskList.appendChild(groupElement);
  });

  taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
};

const fetchAndRender = async () => {
  const result = await window.stickyAPI.getAllTasks();
  if (result && result.ok) {
    renderTasks(result.tasks);
  }
};

openAllButton.addEventListener('click', () => {
  window.stickyAPI.openAllNotes();
});

quitButton.addEventListener('click', () => {
  window.stickyAPI.quit();
});

window.stickyAPI.onTasksSync((payload) => {
  if (payload && Array.isArray(payload.tasks)) {
    renderTasks(payload.tasks);
  }
});

window.stickyAPI.onTaskUpdated(() => {
  fetchAndRender();
});

window.addEventListener('DOMContentLoaded', fetchAndRender);
