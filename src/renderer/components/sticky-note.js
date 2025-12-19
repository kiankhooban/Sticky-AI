const debounce = (callback, delay) => {
  let timer = null;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => callback(...args), delay);
  };
};

const sanitizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\r\n/g, '\n');
};

export const setupStickyNote = ({
  contentElement,
  closeButton,
  actionButtons,
  taskCountElement,
  statusElement,
  onSave,
  onNewNote,
  onAnalyze
}) => {
  const updateStatus = (message) => {
    statusElement.textContent = message;
  };

  const updateTaskCount = (tasks) => {
    const count = tasks.length;
    taskCountElement.textContent = `${count} task${count === 1 ? '' : 's'}`;
  };

  const debouncedSave = debounce(async () => {
    updateStatus('Saving...');
    const content = sanitizeText(contentElement.innerText);
    const result = await onSave({ content });
    updateStatus(result.ok ? 'Saved' : 'Save failed');
  }, 500);

  contentElement.addEventListener('input', () => {
    debouncedSave();
  });

  closeButton.addEventListener('click', () => {
    window.close();
  });

  actionButtons.new.addEventListener('click', () => onNewNote());
  actionButtons.analyze.addEventListener('click', () => onAnalyze());

  return {
    setContent: (content) => {
      contentElement.innerText = sanitizeText(content);
    },
    setTasks: (tasks) => {
      updateTaskCount(tasks);
    },
    setStatus: updateStatus
  };
};
