// Debug Electron environment
console.log('=== Electron Debug ===');
console.log('process.type:', process.type);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
console.log('electron version:', process.versions.electron);
console.log('chrome version:', process.versions.chrome);
console.log('node version:', process.versions.node);
console.log('process.argv:', process.argv);

// Check all electron-related env vars
const electronEnvs = Object.entries(process.env).filter(([k]) => k.toLowerCase().includes('electron'));
console.log('Electron env vars:', electronEnvs);

// Try requiring electron without going through node_modules
// Delete the module cache for electron to try again
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
    if (name === 'electron-test-builtin') {
        // Try to see if electron is loadable as a built-in
        return 'electron';
    }
    return origResolve.call(this, name, ...args);
};

// Check what's in the require cache
const electronCacheKeys = Object.keys(require.cache).filter(k => k.includes('electron'));
console.log('Electron cache keys:', electronCacheKeys);

process.exit(0);
