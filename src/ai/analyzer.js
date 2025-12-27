const { analyzeContentWithRetry } = require('./gemini');
const { parseTasks, mergeTasks } = require('./task-parser');
const { getNoteById, updateNote } = require('../store');
const crypto = require('crypto');

/**
 * Analyze a single note and update its tasks with streaming support
 * @param {string} noteId - Note to analyze
 * @param {function} onStreamChunk - Callback for streaming task chunks (optional)
 * @returns {Promise<object>} Result with tasks and status
 */
const analyzeNote = async (noteId, onStreamChunk = null) => {
  try {
    const note = getNoteById(noteId);
    if (!note) {
      return { ok: false, error: 'Note not found' };
    }
    
    console.log('[AI] Analyzing note:', noteId);
    
    if (!note.content || note.content.trim().length === 0) {
      // Empty note - clear AI tasks
      const manualTasks = (note.tasks || []).filter(t => !t.aiGenerated);
      updateNote(noteId, { tasks: manualTasks });
      return { ok: true, tasks: manualTasks, message: 'Note is empty' };
    }
    
    // Check cache - has content changed?
    const currentHash = crypto.createHash('sha256').update(note.content).digest('hex');
    if (note.contentHash === currentHash && note.lastAnalyzedAt) {
      console.log('[AI] Using cached results (content unchanged)');
      return { 
        ok: true, 
        tasks: note.tasks || [],
        cached: true,
        message: 'Using cached results'
      };
    }
    
    // Call AI with streaming and auto-retry
    console.log('[AI] Calling Gemini API with streaming and auto-retry...');
    const aiResult = await analyzeContentWithRetry(note.content, (partialTasks) => {
      // Stream partial results to UI
      if (onStreamChunk) {
        const parsed = parseTasks(partialTasks);
        onStreamChunk(noteId, parsed);
      }
    });
    
    const parsedTasks = parseTasks(aiResult.tasks);
    console.log('[AI] Final parsed tasks:', parsedTasks.length);
    
    // Merge with existing tasks
    const mergedTasks = mergeTasks(note.tasks || [], parsedTasks);
    
    // Update note with content hash for caching
    const updateResult = updateNote(noteId, { 
      tasks: mergedTasks,
      lastAnalyzedAt: Date.now(),
      contentHash: aiResult.contentHash
    });
    console.log('[AI] Update result:', updateResult.ok);
    
    return { 
      ok: true, 
      tasks: mergedTasks,
      newTaskCount: parsedTasks.length
    };
    
  } catch (error) {
    console.error('Analysis error:', error);
    return { 
      ok: false, 
      error: error.message || 'Analysis failed' 
    };
  }
};

/**
 * Analyze all notes in the database
 * @returns {Promise<object>} Results for all notes
 */
const analyzeAllNotes = async () => {
  const { getAllNotes } = require('../store');
  const allNotes = getAllNotes();
  
  const results = {
    total: allNotes.length,
    analyzed: 0,
    failed: 0,
    totalTasks: 0,
    errors: []
  };
  
  for (const note of allNotes) {
    try {
      const result = await analyzeNote(note.id);
      
      if (result.ok) {
        results.analyzed++;
        results.totalTasks += result.tasks.length;
      } else {
        results.failed++;
        results.errors.push({
          noteId: note.id,
          error: result.error
        });
      }
      
      // Rate limiting: Wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        noteId: note.id,
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  analyzeNote,
  analyzeAllNotes
};
