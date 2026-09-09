import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  version: 'stable',
  workspaceFolder: './test/fixtures/workspace',
  mocha: {
    timeout: 60000,
    ui: 'tdd'
  }
});
