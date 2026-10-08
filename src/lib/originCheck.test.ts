import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSameOrigin } from './originCheck.ts';

test('allows a request whose Origin host matches the Host header', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', {
    headers: { Origin: 'https://bloodlagbe.example', Host: 'bloodlagbe.example' },
  });
  assert.equal(isSameOrigin(request), true);
});

test('blocks a request whose Origin is a different site', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', {
    headers: { Origin: 'https://evil.example', Host: 'bloodlagbe.example' },
  });
  assert.equal(isSameOrigin(request), false);
});

test('allows a request with no Origin header at all (curl, server-to-server, this app\'s own scripts)', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', { headers: { Host: 'bloodlagbe.example' } });
  assert.equal(isSameOrigin(request), true);
});

test('ignores scheme (a TLS-terminating proxy may see http internally while Origin is https), but is port-sensitive', () => {
  const sameHostDifferentScheme = new Request('http://bloodlagbe.example/api/sos', {
    headers: { Origin: 'https://bloodlagbe.example', Host: 'bloodlagbe.example' },
  });
  assert.equal(isSameOrigin(sameHostDifferentScheme), true);

  const otherPort = new Request('https://bloodlagbe.example/api/sos', {
    headers: { Origin: 'https://bloodlagbe.example:8443', Host: 'bloodlagbe.example' },
  });
  assert.equal(isSameOrigin(otherPort), false);
});

test('prefers X-Forwarded-Host over Host when both are present (behind a proxy)', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', {
    headers: { Origin: 'https://public.example', Host: 'internal-service', 'X-Forwarded-Host': 'public.example' },
  });
  assert.equal(isSameOrigin(request), true);
});

test('is not fooled by a server bound to 0.0.0.0 whose request.url reflects the bind address, not the real host', () => {
  // This is the real bug this check exists to avoid: comparing against `new URL(request.url).origin`
  // (as an earlier version of this check did) fails here, because a server started with
  // `--hostname 0.0.0.0` reports `http://0.0.0.0:3310/...` as its own request.url even though the
  // browser's real Origin and Host both say `localhost:3310`.
  const request = new Request('http://0.0.0.0:3310/api/donors', {
    headers: { Origin: 'http://localhost:3310', Host: 'localhost:3310' },
  });
  assert.equal(isSameOrigin(request), true);
});
