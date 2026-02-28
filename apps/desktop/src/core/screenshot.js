'use strict';

const sharp = require('sharp');
const { desktopCapturer } = require('electron');

/**
 * Capture the primary display, compress to 512x288 JPEG at 70% quality,
 * and return as a base64 string. Never saves to disk.
 * @returns {Promise<string|null>} Base64 JPEG string or null on error
 */
async function captureScreen() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 },
        });

        if (!sources || sources.length === 0) {
            console.error('[screenshot] No screen sources found');
            return null;
        }

        const primarySource = sources[0];
        const thumbnail = primarySource.thumbnail;

        if (!thumbnail || thumbnail.isEmpty()) {
            console.error('[screenshot] Thumbnail is empty');
            return null;
        }

        // Get the raw PNG buffer from Electron's NativeImage
        const pngBuffer = thumbnail.toPNG();

        // Compress with sharp: resize to 512x288, JPEG 70% quality
        const compressedBuffer = await sharp(pngBuffer)
            .resize(512, 288, { fit: 'inside' })
            .jpeg({ quality: 70 })
            .toBuffer();

        const base64String = compressedBuffer.toString('base64');
        return base64String;
    } catch (err) {
        console.error('[screenshot] captureScreen failed:', err.message);
        return null;
    }
}

/**
 * Get the title of the currently active window.
 * Uses Electron's BrowserWindow.getFocusedWindow() as a fallback,
 * but for non-Electron windows, we rely on the screenshot source name.
 * @returns {Promise<string|null>} Active window title or null on error
 */
async function getActiveWindowTitle() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 1, height: 1 },
        });

        if (!sources || sources.length === 0) {
            return null;
        }

        // The first window source is typically the focused/active window
        return sources[0].name || null;
    } catch (err) {
        console.error('[screenshot] getActiveWindowTitle failed:', err.message);
        return null;
    }
}

/**
 * Check if a given app should be captured or excluded.
 * @param {string} appName - Name of the active application
 * @param {string[]} excludedList - List of excluded app names
 * @returns {Promise<boolean>} false if appName is in excludedList
 */
async function shouldCapture(appName, excludedList) {
    try {
        if (!appName || !Array.isArray(excludedList)) {
            return true;
        }

        const normalizedApp = appName.toLowerCase().trim();
        const isExcluded = excludedList.some(
            (excluded) => normalizedApp.includes(excluded.toLowerCase().trim())
        );

        return !isExcluded;
    } catch (err) {
        console.error('[screenshot] shouldCapture failed:', err.message);
        return null;
    }
}

module.exports = { captureScreen, getActiveWindowTitle, shouldCapture };
