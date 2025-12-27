/**
 * Parse and validate AI-detected tasks
 * @param {Array} aiTasks - Raw tasks from AI
 * @returns {Array} Validated and formatted tasks
 */
const parseTasks = (aiTasks) => {
  if (!Array.isArray(aiTasks)) {
    return [];
  }
  
  return aiTasks
    .filter(task => task.text && task.text.trim().length > 0)
    .map(task => ({
      text: task.text.trim(),
      completed: false,
      aiGenerated: true,
      priority: validatePriority(task.priority),
      estimatedMinutes: validateEstimate(task.estimatedMinutes),
      category: task.category || 'general',
      reasoning: task.reasoning || '',
      detectedAt: Date.now()
    }));
};

/**
 * Validate priority value
 */
const validatePriority = (priority) => {
  const valid = ['high', 'medium', 'low'];
  return valid.includes(priority) ? priority : 'medium';
};

/**
 * Validate time estimate
 */
const validateEstimate = (minutes) => {
  const num = parseInt(minutes);
  if (isNaN(num) || num < 1) return 15;
  if (num > 480) return 480; // Max 8 hours
  return num;
};

/**
 * Merge AI tasks with existing manual tasks
 * Preserves completion status of existing tasks if text matches
 * @param {Array} existingTasks - Current tasks in note
 * @param {Array} newAiTasks - Newly detected AI tasks
 * @returns {Array} Merged task list
 */
const mergeTasks = (existingTasks, newAiTasks) => {
  const merged = [];
  const existingTexts = new Map();
  
  // Index existing tasks by normalized text
  existingTasks.forEach(task => {
    const normalized = task.text.toLowerCase().trim();
    existingTexts.set(normalized, task);
  });
  
  // Add AI tasks, preserving completion status if they existed before
  newAiTasks.forEach(aiTask => {
    const normalized = aiTask.text.toLowerCase().trim();
    const existing = existingTexts.get(normalized);
    
    if (existing) {
      // Task existed before - keep completion status
      merged.push({
        ...aiTask,
        completed: existing.completed
      });
      existingTexts.delete(normalized);
    } else {
      // New task
      merged.push(aiTask);
    }
  });
  
  // Add remaining manual tasks that weren't detected by AI
  existingTexts.forEach(task => {
    if (!task.aiGenerated) {
      merged.push(task);
    }
  });
  
  return merged;
};

module.exports = {
  parseTasks,
  mergeTasks
};
