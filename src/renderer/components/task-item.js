export const createTaskItem = ({ text, completed }) => {
  const item = document.createElement('div');
  item.className = 'task-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = completed;

  const label = document.createElement('span');
  label.textContent = text;

  item.append(checkbox, label);
  return item;
};
