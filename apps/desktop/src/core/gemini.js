'use strict';

/**
 * CognitionX — AI Analysis via OpenRouter API (google/gemini-2.0-flash-001)
 *
 * Uses OpenAI-compatible chat completions endpoint.
 * Supports vision (screenshot) and text-only (OCR) analysis.
 */

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';
const TIMEOUT_MS = 10000;

/**
 * Build the system prompt for focus analysis.
 * @param {string} taskText - The user's declared focus task
 * @param {string[]} recentHistory - Last 3 page_context strings
 * @returns {string}
 */
function buildSystemPrompt(taskText, recentHistory = []) {
    const historyStr = recentHistory.length > 0
        ? `Recent activity: ${recentHistory.join(' → ')}`
        : 'No recent activity history.';

    return `You are a focus analysis AI. Given information about a student's screen, analyze what they are doing and compare it to their declared task.
Always respond ONLY with valid JSON matching this schema exactly:
{
  "activity_type": one of ["STUDY", "CODE", "SOCIAL_MEDIA", "GAMING", "VIDEO_RELEVANT", "VIDEO_DISTRACTION", "BROWSE_RELEVANT", "BROWSE_DISTRACTION", "IDLE"],
  "app_name": "string (name of the application or website)",
  "page_context": "string (brief description of what is visible on screen)",
  "relevance_score": number 0-100 (how aligned the current activity is with the declared task),
  "confidence": number 0-100 (how confident you are in this assessment),
  "return_prompt": "string (short, friendly message to refocus the student if distracted)"
}

Declared task: "${taskText}"
${historyStr}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no explanation, no code fences.
- relevance_score 80-100 means clearly on-task.
- relevance_score 50-79 means potentially related but drifting.
- relevance_score 0-49 means clearly off-task/distracted.
- Be fair: YouTube/Reddit CAN be relevant if the content matches the declared task.`;
}

/**
 * Call OpenRouter API.
 * @param {Array} messages
 * @returns {Promise<string|null>}
 */
async function callAPI(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('[ai] OPENAI_API_KEY not set');
        return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                temperature: 0.1,
                max_tokens: 300,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text().catch(() => 'unknown');
            console.error(`[ai] API error ${response.status}:`, errText.substring(0, 200));
            return null;
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || null;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn('[ai] API timeout');
        } else {
            console.error('[ai] API call error:', err.message);
        }
        return null;
    }
}

/**
 * Safely parse JSON from LLM output.
 * @param {string} text
 * @returns {object|null}
 */
function safeParseJSON(text) {
    try {
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);

        if (
            typeof parsed.activity_type !== 'string' ||
            typeof parsed.relevance_score !== 'number' ||
            typeof parsed.confidence !== 'number'
        ) {
            console.error('[ai] Response missing required fields');
            return null;
        }

        return parsed;
    } catch (err) {
        console.error('[ai] JSON parse failed:', err.message);
        return null;
    }
}

/**
 * Analyze a screenshot using vision.
 * @param {string} base64ImageString - Base64-encoded JPEG screenshot
 * @param {string} taskText - User's declared focus task
 * @param {string[]} recentHistory - Last 3 page_context strings
 * @returns {Promise<object|null>}
 */
async function analyzeScreenshot(base64ImageString, taskText, recentHistory = []) {
    try {
        const messages = [
            { role: 'system', content: buildSystemPrompt(taskText, recentHistory) },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Analyze this screenshot and determine what the student is doing.' },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64ImageString}`,
                            detail: 'low',
                        },
                    },
                ],
            },
        ];

        const content = await callAPI(messages);
        if (!content) return null;

        return safeParseJSON(content);
    } catch (err) {
        console.error('[ai] analyzeScreenshot failed:', err.message);
        return null;
    }
}

/**
 * Analyze OCR-extracted text (cheaper, no image).
 * @param {string} pageText - OCR-extracted text from the screenshot
 * @param {string} taskText - User's declared focus task
 * @returns {Promise<object|null>}
 */
async function analyzeText(pageText, taskText) {
    try {
        const messages = [
            { role: 'system', content: buildSystemPrompt(taskText) },
            {
                role: 'user',
                content: `The following text was extracted from the student's screen via OCR:\n\n"${pageText}"\n\nAnalyze this text and determine what the student is doing.`,
            },
        ];

        const content = await callAPI(messages);
        if (!content) return null;

        return safeParseJSON(content);
    } catch (err) {
        console.error('[ai] analyzeText failed:', err.message);
        return null;
    }
}

module.exports = { analyzeScreenshot, analyzeText };
