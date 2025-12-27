const fetch = require('node-fetch');
const crypto = require('crypto');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_STREAM_ENDPOINT = 
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent';

/**
 * Analyze note content with Gemini AI using streaming for progressive results
 * @param {string} content - Note content to analyze
 * @param {function} onChunk - Callback for each streamed task chunk (optional)
 * @returns {Promise<object>} AI analysis result
 */
const analyzeContent = async (content, onChunk = null) => {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] API key missing!');
    throw new Error('GEMINI_API_KEY not found in environment variables. Please create .env file.');
  }
  
  if (!content || content.trim().length === 0) {
    return { tasks: [], contentHash: '' };
  }
  
  const prompt = `Analyze the following note and extract all tasks, to-dos, and action items.

For each task, provide:
1. text: The task description (clear, actionable)
2. priority: "high", "medium", or "low"
3. estimatedMinutes: Realistic time estimate in minutes
4. category: Type of task (e.g., "work", "personal", "errands", "health")
5. reasoning: Brief explanation of why you identified this as a task

Note content:
"""
${content}
"""

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "tasks": [
    {
      "text": "Task description",
      "priority": "medium",
      "estimatedMinutes": 30,
      "category": "work",
      "reasoning": "Brief explanation"
    }
  ]
}

If no tasks are found, return: {"tasks": []}`;

  try {
    const response = await fetch(`${GEMINI_STREAM_ENDPOINT}?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key. Please check your GEMINI_API_KEY in .env file.');
      } else {
        throw new Error(`API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }
    }
    
    // Parse streaming response
    let accumulatedText = '';
    const body = response.body;
    let buffer = '';
    
    // Read the stream
    for await (const chunk of body) {
      buffer += chunk.toString();
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6);
            const data = JSON.parse(jsonStr);
            
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const textChunk = data.candidates[0].content.parts[0].text;
              accumulatedText += textChunk;
              
              // Try to parse and emit partial tasks
              if (onChunk) {
                try {
                  const cleaned = accumulatedText
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                  
                  const partial = JSON.parse(cleaned);
                  if (partial.tasks && Array.isArray(partial.tasks)) {
                    onChunk(partial.tasks);
                  }
                } catch {
                  // Incomplete JSON, wait for more chunks
                }
              }
            }
          } catch (parseError) {
            // Skip malformed SSE messages
          }
        }
      }
    }
    
    // Parse final accumulated response
    const cleanedResponse = accumulatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedResponse);
    
    // Generate content hash for caching
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    return {
      tasks: parsed.tasks || [],
      analyzedAt: Date.now(),
      modelUsed: 'gemini-3-flash-preview',
      contentHash
    };
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('AI returned invalid response format. Please try again.');
    }
    throw error;
  }
};

/**
 * Analyze content with automatic retry on transient failures
 * @param {string} content - Note content
 * @param {function} onChunk - Streaming callback
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<object>} Analysis result
 */
const analyzeContentWithRetry = async (content, onChunk = null, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini] Analysis attempt ${attempt}/${maxRetries}`);
      return await analyzeContent(content, onChunk);
    } catch (error) {
      lastError = error;
      
      // Don't retry on permanent errors
      if (error.message.includes('Invalid API key') || 
          error.message.includes('invalid response format')) {
        throw error;
      }
      
      // Retry on transient errors (rate limits, server errors, timeouts)
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[Gemini] Retry in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Analysis failed after ${maxRetries} attempts: ${lastError.message}`);
};

module.exports = {
  analyzeContent,
  analyzeContentWithRetry
};
