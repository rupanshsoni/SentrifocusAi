'use strict';

/**
 * CognitionX — Detection Rulesets
 *
 * Central registry of known process names and browser title patterns
 * used by Layer 1 (ProcessScanner) and Layer 2 (WindowWatcher).
 *
 * Score semantics:
 *   0       → instant distraction (games, pure entertainment)
 *   1-30    → soft distraction (Discord, Spotify — context-dependent)
 *   31-69   → ambiguous (needs Gemini)
 *   70-95   → instant focus (IDEs, productivity apps)
 *   -1      → explicitly ambiguous — always send to Gemini
 */

// ─── Layer 1 & 2: Process Rules ─────────────────────────────────────────────
// Keys are LOWERCASE process names (as returned by tasklist / ps).

const PROCESS_RULES = {
    // === Games (score 0 — instant distraction) ===
    'steam.exe':                        { displayName: 'Steam',           score: 0,  category: 'GAMING' },
    'steamwebhelper.exe':               { displayName: 'Steam',           score: 0,  category: 'GAMING' },
    'javaw.exe':                        { displayName: 'Minecraft',       score: 0,  category: 'GAMING' },
    'minecraft.exe':                    { displayName: 'Minecraft',       score: 0,  category: 'GAMING' },
    'robloxplayerbeta.exe':             { displayName: 'Roblox',          score: 0,  category: 'GAMING' },
    'epicgameslauncher.exe':            { displayName: 'Epic Games',      score: 0,  category: 'GAMING' },
    'unrealcefsubprocess.exe':          { displayName: 'Epic Games',      score: 0,  category: 'GAMING' },
    'battle.net.exe':                   { displayName: 'Battle.net',      score: 0,  category: 'GAMING' },
    'leagueclient.exe':                 { displayName: 'League of Legends', score: 0, category: 'GAMING' },
    'league of legends.exe':            { displayName: 'League of Legends', score: 0, category: 'GAMING' },
    'valorant-win64-shipping.exe':      { displayName: 'Valorant',        score: 0,  category: 'GAMING' },
    'valorant.exe':                     { displayName: 'Valorant',        score: 0,  category: 'GAMING' },
    'fortniteclient-win64-shipping.exe': { displayName: 'Fortnite',       score: 0,  category: 'GAMING' },
    'fortnitelauncher.exe':             { displayName: 'Fortnite',        score: 0,  category: 'GAMING' },
    'genshinimpact.exe':                { displayName: 'Genshin Impact',  score: 0,  category: 'GAMING' },
    'eldenring.exe':                    { displayName: 'Elden Ring',      score: 0,  category: 'GAMING' },
    'rocketleague.exe':                 { displayName: 'Rocket League',   score: 0,  category: 'GAMING' },
    'csgo.exe':                         { displayName: 'CS:GO',           score: 0,  category: 'GAMING' },
    'cs2.exe':                          { displayName: 'CS2',             score: 0,  category: 'GAMING' },
    'apex_r5win64_retail.exe':          { displayName: 'Apex Legends',    score: 0,  category: 'GAMING' },
    'overwatch.exe':                    { displayName: 'Overwatch',       score: 0,  category: 'GAMING' },
    'dota2.exe':                        { displayName: 'Dota 2',          score: 0,  category: 'GAMING' },
    'gtav.exe':                         { displayName: 'GTA V',           score: 0,  category: 'GAMING' },

    // === Social (score 15 — soft distraction, study contexts exist) ===
    'discord.exe':                      { displayName: 'Discord',         score: 15, category: 'SOCIAL' },
    'discord':                          { displayName: 'Discord',         score: 15, category: 'SOCIAL' },
    'telegram.exe':                     { displayName: 'Telegram',        score: 15, category: 'SOCIAL' },
    'telegram':                         { displayName: 'Telegram',        score: 15, category: 'SOCIAL' },
    'whatsapp.exe':                     { displayName: 'WhatsApp',        score: 15, category: 'SOCIAL' },
    'whatsapp':                         { displayName: 'WhatsApp',        score: 15, category: 'SOCIAL' },

    // === Microsoft Store / UWP variants (caught by Get-Process) ===
    'applicationframehost.exe':         { displayName: 'Store App (UWP)', score: -1, category: 'UWP_UNKNOWN' },
    'applicationframehost':             { displayName: 'Store App (UWP)', score: -1, category: 'UWP_UNKNOWN' },

    // === Communication / Work-ambiguous (score 40) ===
    'slack.exe':                        { displayName: 'Slack',           score: 40, category: 'COMMUNICATION' },
    'teams.exe':                        { displayName: 'Teams',           score: 40, category: 'COMMUNICATION' },
    'zoom.exe':                         { displayName: 'Zoom',            score: 40, category: 'COMMUNICATION' },

    // === Entertainment (score 20 — lo-fi / background music is OK-ish) ===
    'spotify.exe':                      { displayName: 'Spotify',         score: 20, category: 'ENTERTAINMENT' },
    'spotify':                          { displayName: 'Spotify',         score: 20, category: 'ENTERTAINMENT' },

    // === Focus / Productivity Apps (score 80-90) ===
    'code.exe':                         { displayName: 'VS Code',         score: 90, category: 'FOCUS' },
    'cursor.exe':                       { displayName: 'Cursor',          score: 90, category: 'FOCUS' },
    'idea64.exe':                       { displayName: 'IntelliJ IDEA',   score: 90, category: 'FOCUS' },
    'webstorm64.exe':                   { displayName: 'WebStorm',        score: 90, category: 'FOCUS' },
    'pycharm64.exe':                    { displayName: 'PyCharm',         score: 90, category: 'FOCUS' },
    'clion64.exe':                      { displayName: 'CLion',           score: 90, category: 'FOCUS' },
    'goland64.exe':                     { displayName: 'GoLand',          score: 90, category: 'FOCUS' },
    'rubymine64.exe':                   { displayName: 'RubyMine',        score: 90, category: 'FOCUS' },
    'sublime_text.exe':                 { displayName: 'Sublime Text',    score: 85, category: 'FOCUS' },
    'notepad++.exe':                    { displayName: 'Notepad++',       score: 80, category: 'FOCUS' },
    'winword.exe':                      { displayName: 'Microsoft Word',  score: 80, category: 'FOCUS' },
    'excel.exe':                        { displayName: 'Microsoft Excel', score: 80, category: 'FOCUS' },
    'powerpnt.exe':                     { displayName: 'PowerPoint',      score: 80, category: 'FOCUS' },
    'onenote.exe':                      { displayName: 'OneNote',         score: 80, category: 'FOCUS' },
    'figma.exe':                        { displayName: 'Figma',           score: 85, category: 'FOCUS' },
    'obsidian.exe':                     { displayName: 'Obsidian',        score: 85, category: 'FOCUS' },
    'notion.exe':                       { displayName: 'Notion',          score: 85, category: 'FOCUS' },
    'windowsterminal.exe':              { displayName: 'Windows Terminal', score: 85, category: 'FOCUS' },
    'cmd.exe':                          { displayName: 'Command Prompt',  score: 80, category: 'FOCUS' },
    'powershell.exe':                   { displayName: 'PowerShell',      score: 80, category: 'FOCUS' },
    'pwsh.exe':                         { displayName: 'PowerShell',      score: 80, category: 'FOCUS' },
    'mintty.exe':                       { displayName: 'Git Bash',        score: 80, category: 'FOCUS' },
    'acrobat.exe':                      { displayName: 'Acrobat Reader',  score: 80, category: 'FOCUS' },
    'acrord32.exe':                     { displayName: 'Acrobat Reader',  score: 80, category: 'FOCUS' },
    'zotero.exe':                       { displayName: 'Zotero',          score: 85, category: 'FOCUS' },
    'anki.exe':                         { displayName: 'Anki',            score: 85, category: 'FOCUS' },
};

// ─── Layer 2: Browser Title Rules ───────────────────────────────────────────
// Checked in order against the lowercase window title.
// score = -1 means "ambiguous, send to Gemini for vision analysis".

const BROWSER_TITLE_RULES = [
    // --- Instant distraction (score 0) ---
    { pattern: 'netflix',           score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Netflix' },
    { pattern: 'hulu',              score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Hulu' },
    { pattern: 'primevideo',        score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Prime Video' },
    { pattern: 'prime video',       score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Prime Video' },
    { pattern: 'disneyplus',        score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Disney+' },
    { pattern: 'disney+',           score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Disney+' },
    { pattern: 'hotstar',           score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Hotstar' },
    { pattern: 'crunchyroll',       score: 0,  category: 'VIDEO_DISTRACTION',   label: 'Crunchyroll' },
    { pattern: 'facebook.com',      score: 0,  category: 'SOCIAL_MEDIA',        label: 'Facebook' },
    { pattern: 'facebook -',        score: 0,  category: 'SOCIAL_MEDIA',        label: 'Facebook' },
    { pattern: 'instagram',         score: 0,  category: 'SOCIAL_MEDIA',        label: 'Instagram' },
    { pattern: 'twitter.com',       score: 0,  category: 'SOCIAL_MEDIA',        label: 'Twitter/X' },
    { pattern: 'x.com',             score: 0,  category: 'SOCIAL_MEDIA',        label: 'Twitter/X' },
    { pattern: '/ x',               score: 0,  category: 'SOCIAL_MEDIA',        label: 'Twitter/X' },
    { pattern: 'tiktok',            score: 0,  category: 'SOCIAL_MEDIA',        label: 'TikTok' },
    { pattern: 'snapchat',          score: 0,  category: 'SOCIAL_MEDIA',        label: 'Snapchat' },

    // --- Soft distraction (score 10-25) ---
    { pattern: 'reddit',            score: 25, category: 'BROWSE_DISTRACTION',  label: 'Reddit' },
    { pattern: '9gag',              score: 0,  category: 'BROWSE_DISTRACTION',  label: '9GAG' },
    { pattern: 'buzzfeed',          score: 0,  category: 'BROWSE_DISTRACTION',  label: 'BuzzFeed' },
    { pattern: 'imgur',             score: 5,  category: 'BROWSE_DISTRACTION',  label: 'Imgur' },

    // --- Ambiguous (score -1 → send to Gemini) ---
    { pattern: 'youtube',           score: -1, category: 'VIDEO_AMBIGUOUS',     label: 'YouTube' },
    { pattern: 'twitch',            score: -1, category: 'VIDEO_AMBIGUOUS',     label: 'Twitch' },

    // --- Focus sites (score 75-90) ---
    { pattern: 'stackoverflow',     score: 80, category: 'BROWSE_RELEVANT',     label: 'Stack Overflow' },
    { pattern: 'stackexchange',     score: 80, category: 'BROWSE_RELEVANT',     label: 'Stack Exchange' },
    { pattern: 'github.com',        score: 85, category: 'BROWSE_RELEVANT',     label: 'GitHub' },
    { pattern: 'gitlab.com',        score: 85, category: 'BROWSE_RELEVANT',     label: 'GitLab' },
    { pattern: 'docs.google',       score: 80, category: 'BROWSE_RELEVANT',     label: 'Google Docs' },
    { pattern: 'notion.so',         score: 85, category: 'BROWSE_RELEVANT',     label: 'Notion' },
    { pattern: 'coursera',          score: 85, category: 'BROWSE_RELEVANT',     label: 'Coursera' },
    { pattern: 'udemy',             score: 85, category: 'BROWSE_RELEVANT',     label: 'Udemy' },
    { pattern: 'edx.org',           score: 85, category: 'BROWSE_RELEVANT',     label: 'edX' },
    { pattern: 'khanacademy',       score: 85, category: 'BROWSE_RELEVANT',     label: 'Khan Academy' },
    { pattern: 'khan academy',      score: 85, category: 'BROWSE_RELEVANT',     label: 'Khan Academy' },
    { pattern: 'arxiv',             score: 90, category: 'BROWSE_RELEVANT',     label: 'arXiv' },
    { pattern: 'pubmed',            score: 90, category: 'BROWSE_RELEVANT',     label: 'PubMed' },
    { pattern: 'jstor',             score: 90, category: 'BROWSE_RELEVANT',     label: 'JSTOR' },
    { pattern: 'scholar.google',    score: 90, category: 'BROWSE_RELEVANT',     label: 'Google Scholar' },
    { pattern: 'leetcode',          score: 85, category: 'BROWSE_RELEVANT',     label: 'LeetCode' },
    { pattern: 'hackerrank',        score: 85, category: 'BROWSE_RELEVANT',     label: 'HackerRank' },
    { pattern: 'codeforces',        score: 85, category: 'BROWSE_RELEVANT',     label: 'Codeforces' },
    { pattern: 'developer.mozilla', score: 80, category: 'BROWSE_RELEVANT',     label: 'MDN' },
    { pattern: 'w3schools',         score: 75, category: 'BROWSE_RELEVANT',     label: 'W3Schools' },
    { pattern: 'overleaf',          score: 90, category: 'BROWSE_RELEVANT',     label: 'Overleaf' },
    { pattern: 'wikipedia',         score: 70, category: 'BROWSE_RELEVANT',     label: 'Wikipedia' },
    { pattern: 'geeksforgeeks',     score: 80, category: 'BROWSE_RELEVANT',     label: 'GeeksforGeeks' },
    { pattern: 'medium.com',        score: 60, category: 'BROWSE_RELEVANT',     label: 'Medium' },
    { pattern: 'dev.to',            score: 75, category: 'BROWSE_RELEVANT',     label: 'DEV.to' },
    { pattern: 'chatgpt',           score: 70, category: 'BROWSE_RELEVANT',     label: 'ChatGPT' },
    { pattern: 'claude.ai',         score: 70, category: 'BROWSE_RELEVANT',     label: 'Claude' },
    { pattern: 'gemini.google',     score: 70, category: 'BROWSE_RELEVANT',     label: 'Gemini' },
];

// ─── Known browser process names ────────────────────────────────────────────
const BROWSER_PROCESSES = new Set([
    'chrome.exe', 'firefox.exe', 'msedge.exe', 'brave.exe',
    'opera.exe', 'vivaldi.exe', 'arc.exe',
    'google chrome', 'firefox', 'microsoft edge', 'brave browser',
    'opera', 'vivaldi', 'arc',
]);

/**
 * Check if a process/application name is a browser.
 * @param {string} name - Lowercase process or application name
 * @returns {boolean}
 */
function isBrowser(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    if (BROWSER_PROCESSES.has(lower)) return true;
    // Fuzzy: check if the name contains a known browser keyword
    return lower.includes('chrome') || lower.includes('firefox') ||
           lower.includes('edge') || lower.includes('brave') ||
           lower.includes('opera') || lower.includes('vivaldi') ||
           lower.includes('safari') || lower.includes('arc');
}

/**
 * Match a browser window title against BROWSER_TITLE_RULES.
 * @param {string} title - Lowercase window title
 * @returns {{ score: number, category: string, label: string } | null}
 */
function matchBrowserTitle(title) {
    if (!title) return null;
    const lower = title.toLowerCase();
    for (const rule of BROWSER_TITLE_RULES) {
        if (lower.includes(rule.pattern)) {
            return { score: rule.score, category: rule.category, label: rule.label };
        }
    }
    return null;
}

/**
 * Look up a process name in PROCESS_RULES.
 * @param {string} processName - Lowercase process name
 * @returns {{ displayName: string, score: number, category: string } | null}
 */
function matchProcess(processName) {
    if (!processName) return null;
    return PROCESS_RULES[processName.toLowerCase()] || null;
}

// ─── Title Fallback Rules for UWP / Store Apps ─────────────────────────────
// When application name is empty or 'applicationframehost', match title instead.
const TITLE_FALLBACK_RULES = {
    'whatsapp':        { displayName: 'WhatsApp',        score: 15, category: 'SOCIAL' },
    'discord':         { displayName: 'Discord',         score: 15, category: 'SOCIAL' },
    'telegram':        { displayName: 'Telegram',        score: 15, category: 'SOCIAL' },
    'microsoft store': { displayName: 'Microsoft Store', score: 10, category: 'ENTERTAINMENT' },
    'store':           { displayName: 'Microsoft Store', score: 10, category: 'ENTERTAINMENT' },
    'spotify':         { displayName: 'Spotify',         score: 20, category: 'ENTERTAINMENT' },
    'netflix':         { displayName: 'Netflix',         score: 0,  category: 'VIDEO_DISTRACTION' },
    'xbox':            { displayName: 'Xbox',            score: 0,  category: 'GAMING' },
    'minecraft':       { displayName: 'Minecraft',       score: 0,  category: 'GAMING' },
};

/**
 * Match a window title against TITLE_FALLBACK_RULES.
 * Used when the application name is missing or generic (UWP/Store apps).
 * @param {string} title - Lowercase window title
 * @returns {{ displayName: string, score: number, category: string } | null}
 */
function matchTitleFallback(title) {
    if (!title) return null;
    const lower = title.toLowerCase();
    for (const [keyword, rule] of Object.entries(TITLE_FALLBACK_RULES)) {
        if (lower.includes(keyword)) {
            return rule;
        }
    }
    return null;
}

module.exports = {
    PROCESS_RULES,
    BROWSER_TITLE_RULES,
    BROWSER_PROCESSES,
    TITLE_FALLBACK_RULES,
    isBrowser,
    matchBrowserTitle,
    matchProcess,
    matchTitleFallback,
};
