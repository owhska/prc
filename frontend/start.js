#!/usr/bin/env node

import { spawn } from 'child_process';

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

console.log(`Starting Vite preview server on ${host}:${port}`);

// Start the preview server (build already done in build command)
const previewProcess = spawn('npx', ['vite', 'preview', '--port', port.toString(), '--host', host], {
  stdio: 'inherit',
  shell: true
});

previewProcess.on('close', (previewCode) => {
  console.log(`Preview server exited with code ${previewCode}`);
  process.exit(previewCode);
});

previewProcess.on('error', (err) => {
  console.error('Failed to start preview server:', err);
  process.exit(1);
});
