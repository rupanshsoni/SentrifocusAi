#!/usr/bin/env node
'use strict';

/**
 * Launch Electron without ELECTRON_RUN_AS_NODE set.
 * npx sets this env var, which forces electron.exe to run as plain Node.js.
 * This script spawns electron.exe directly with the env var deleted.
 */
const { spawn } = require('child_process');
const path = require('path');

// Get the electron binary path
const electronPath = require('electron');

// Clone env and remove the problematic variable
const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [path.join(__dirname, '..')], {
    stdio: 'inherit',
    env,
    windowsHide: false,
});

child.on('close', (code) => {
    process.exit(code || 0);
});
