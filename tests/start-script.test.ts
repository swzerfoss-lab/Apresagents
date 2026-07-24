import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';

describe('production start script', () => {
  it('starts the HTTP server entrypoint', () => {
    expect(packageJson.scripts.start).toBe('node dist/server.js');
  });
});
