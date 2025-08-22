#!/usr/bin/env node

import { spawn } from 'child_process';

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

console.log(`Starting Vite preview server on ${host}:${port}`);

// First build the app
const buildProcess = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    // If build succeeded, start the preview server
    const previewProcess = spawn('npx', ['vite', 'preview', '--port', port.toString(), '--host', host], {
      stdio: 'inherit',
      shell: true
    });

    previewProcess.on('close', (previewCode) => {
      process.exit(previewCode);
    });

    previewProcess.on('error', (err) => {
      console.error('Failed to start preview server:', err);
      process.exit(1);
    });
  } else {
    console.error('Build failed');
    process.exit(code);
  }
});

buildProcess.on('error', (err) => {
  console.error('Failed to start build:', err);
  process.exit(1);
});
