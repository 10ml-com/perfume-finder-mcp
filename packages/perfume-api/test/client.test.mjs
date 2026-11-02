// Unit tests with a mocked fetch: request building, 404 bodies, errors, compare. Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_BASE_URL, PerfumeApiError, createClient } from '../dist/index.js';

function mock(handler) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const { status = 200, body } = await handler(String(url));
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}
const perfume = (id, family, key_notes, accords) => ({ id, name: id, house: 'H', gender: 'unisex', family, accords, key_notes, character: 'x', links: [], profile: 'core' });

test('default base URL', () => assert.equal(DEFAULT_BASE_URL, 'https://mcp.10ml.com/api/v1'));

test('searchPerfumes builds the query, joins arrays, skips undefined', async () => {
  const { fetch, calls } = mock(() => ({ body: { total: 0, results: [], filters: {}, relaxed: false, source: 's' } }));
  const api = createClient({ fetch });
  await api.searchPerfumes({ q: 'fresh citrus', notes_include: ['vanilla', 'oud'], gender: 'men', limit: 3, house: undefined, iconic: true });
  const u = new URL(calls[0].url);
  assert.equal(u.origin + u.pathname, 'https://mcp.10ml.com/api/v1/perfumes');
  assert.equal(u.searchParams.get('q'), 'fresh citrus');
  assert.equal(u.searchParams.get('notes_include'), 'vanilla,oud');
  assert.equal(u.searchParams.get('limit'), '3');
  assert.equal(u.searchParams.get('iconic'), 'true');
  assert.equal(u.searchParams.has('house'), false);
  assert.equal(calls[0].init.headers.accept, 'application/json');
});

test('path ids are encoded and the base URL is configurable', async () => {
  const { fetch, calls } = mock(() => ({ body: { found: true, exact: true, source: 's' } }));
  const api = createClient({ fetch, baseUrl: 'https://example.test/v1/' });
  await api.getPerfume('Baccarat Rouge 540', { locale: 'de' });
  await api.explainNote('ambroxan');
  await api.getHouse('MFK');
  assert.equal(calls[0].url, 'https://example.test/v1/perfumes/Baccarat%20Rouge%20540?locale=de');
  assert.equal(calls[1].url, 'https://example.test/v1/notes/ambroxan');
  assert.equal(calls[2].url, 'https://example.test/v1/houses/MFK');
});

test('each method calls its route', async () => {
  const { fetch, calls } = mock(() => ({ body: {} }));
  const api = createClient({ fetch });
  await api.similarPerfumes({ perfume: 'Sauvage', steer: 'fresher' });
  await api.perfumeAlternatives({ perfume: 'Delina' });
  await api.listHouses({ type: 'niche', limit: 2 });
  await api.searchGuides({ q: 'layering' });
  assert.deepEqual(
    calls.map((c) => new URL(c.url).pathname),
    ['/api/v1/similar', '/api/v1/alternatives', '/api/v1/houses', '/api/v1/guides'],
  );
});

test('a 404 returns the body (found: false) instead of throwing', async () => {
  const { fetch } = mock(() => ({ status: 404, body: { found: false, suggestions: [], message: 'no', source: 's' } }));
  const res = await createClient({ fetch }).getHouse('nope');
  assert.equal(res.found, false);
});

test('a 400 throws PerfumeApiError with status, code and message', async () => {
  const { fetch } = mock(() => ({ status: 400, body: { error: { code: 'invalid_request', message: 'limit: too big' } } }));
  await assert.rejects(createClient({ fetch }).searchPerfumes({ limit: 99 }), (e) => {
    assert.ok(e instanceof PerfumeApiError);
    assert.equal(e.status, 400);
    assert.equal(e.code, 'invalid_request');
    assert.equal(e.message, 'limit: too big');
    return true;
  });
});

test('a non-JSON server error still throws PerfumeApiError', async () => {
  const { fetch } = mock(() => ({ status: 502, body: 'bad gateway' }));
  await assert.rejects(createClient({ fetch }).listHouses(), (e) => e instanceof PerfumeApiError && e.status === 502 && e.code === 'http_error');
});

test('comparePerfumes diffs notes and accords from the profiles', async () => {
  const data = {
    a: perfume('a', 'Woody', ['saffron', 'cedar', 'amber'], ['woody', 'sweet']),
    b: perfume('b', 'Woody', ['Saffron', 'jasmine'], ['woody', 'fresh']),
  };
  const { fetch } = mock((url) => {
    const id = decodeURIComponent(new URL(url).pathname.split('/').pop());
    return id in data ? { body: { found: true, exact: true, perfume: data[id], source: 's' } } : { status: 404, body: { found: false, exact: false, source: 's' } };
  });
  const cmp = await createClient({ fetch }).comparePerfumes(['a', 'b', 'zzz']);
  assert.deepEqual(cmp.not_found, ['zzz']);
  assert.equal(cmp.same_family, true);
  assert.deepEqual(cmp.shared_notes, ['saffron']);
  assert.deepEqual(cmp.shared_accords, ['woody']);
  assert.deepEqual(cmp.only.a, { notes: ['cedar', 'amber'], accords: ['sweet'] });
  assert.deepEqual(cmp.only.b, { notes: ['jasmine'], accords: ['fresh'] });
});

test('comparePerfumes needs 2 to 4 names', async () => {
  const api = createClient({ fetch: mock(() => ({ body: {} })).fetch });
  await assert.rejects(api.comparePerfumes(['a']), RangeError);
  await assert.rejects(api.comparePerfumes(['a', 'b', 'c', 'd', 'e']), RangeError);
});

test('timeout aborts a hanging request', async () => {
  const fetch = (_u, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  await assert.rejects(createClient({ fetch, timeoutMs: 20 }).listHouses(), /aborted/);
});
