import assert from 'node:assert/strict';
import test from 'node:test';

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000';

test('does not expose OCR document routes', async () => {
  const statuses = await Promise.all(
    ['/api/scan-ktp', '/api/scan-kk'].map(async (path) => {
      const response = await fetch(`${appUrl}${path}`);
      return response.status;
    }),
  );

  assert.deepEqual(statuses, [404, 404]);
});
