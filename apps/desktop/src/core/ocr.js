'use strict';

const Tesseract = require('tesseract.js');

let worker = null;

/**
 * Initialize the Tesseract worker (lazy, singleton).
 * @returns {Promise<import('tesseract.js').Worker>}
 */
async function getWorker() {
    if (!worker) {
        worker = await Tesseract.createWorker('eng');
    }
    return worker;
}

/**
 * Extract text from a base64 JPEG image using Tesseract OCR.
 * @param {string} base64ImageString - Base64-encoded JPEG image
 * @returns {Promise<{text: string, confidence: number, wordCount: number}|null>}
 */
async function extractText(base64ImageString) {
    try {
        if (!base64ImageString || typeof base64ImageString !== 'string') {
            return null;
        }

        const w = await getWorker();
        const buffer = Buffer.from(base64ImageString, 'base64');
        const { data } = await w.recognize(buffer);

        const text = (data.text || '').trim();
        const confidence = Math.round(data.confidence || 0);
        const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

        return { text, confidence, wordCount };
    } catch (err) {
        console.error('[ocr] extractText failed:', err.message);
        return null;
    }
}

/**
 * Determine if OCR output has enough content to skip the expensive LLM Vision call.
 * @param {{text: string, confidence: number, wordCount: number}|null} ocrResult
 * @returns {boolean} true if OCR is sufficient (wordCount > 30 AND confidence > 70)
 */
function isSufficient(ocrResult) {
    if (!ocrResult) return false;
    return ocrResult.wordCount > 30 && ocrResult.confidence > 70;
}

module.exports = { extractText, isSufficient };
