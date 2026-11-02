import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  PerfumeApiError,
  buildUrl,
  findPerfumeAlternatives,
  findSimilarPerfumes,
  getPerfume,
  getPerfumeHouse,
  explainNote,
  listPerfumeHouses,
  perfumeTools,
  searchPerfumeGuides,
  searchPerfumes,
} from '../src/index.js';

type Call = { url: URL; init?: RequestInit };

function mockFetch(body: unknown = { results: [], total: 0 }, status = 200) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

// AI SDK tool().execute takes (input, options); the tests supply the minimal options object.
const run = (t: { execute?: (...a: any[]) => any }, input: unknown) => t.execute!(input, { toolCallId: 't', messages: [] });

describe('perfumeTools', () => {
  it('exports eight tools with descriptions and input schemas', () => {
    const tools = perfumeTools();
    expect(Object.keys(tools)).toEqual([
      'searchPerfumes', 'getPerfume', 'findSimilarPerfumes', 'findPerfumeAlternatives',
      'explainNote', 'getPerfumeHouse', 'listPerfumeHouses', 'searchPerfumeGuides',
    ]);
    for (const [name, t] of Object.entries(tools)) {
      expect((t as any).description.length, name).toBeGreaterThan(60);
      expect((t as any).inputSchema, name).toBeDefined();
      expect(typeof (t as any).execute, name).toBe('function');
    }
  });

  it('every input field has a description (models read them)', () => {
    for (const t of Object.values(perfumeTools()) as any[]) {
      const shape = t.inputSchema.shape ?? t.inputSchema._def?.shape?.();
      for (const [key, field] of Object.entries<any>(shape)) expect(field.description, key).toBeTruthy();
    }
  });
});

describe('request mapping', () => {
  it('searchPerfumes maps query->q, detail->format, joins arrays', async () => {
    const { calls, fetchImpl } = mockFetch();
    await run(searchPerfumes({ fetch: fetchImpl }), {
      query: 'fresh citrus', notes_include: ['oud', 'sandalwood'], gender: 'men', iconic: true, limit: 3, detail: 'detailed', locale: 'de',
    });
    expect(calls[0]!.url.origin + calls[0]!.url.pathname).toBe('https://mcp.10ml.com/api/v1/perfumes');
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({
      q: 'fresh citrus', notes_include: 'oud,sandalwood', gender: 'men', iconic: 'true', limit: '3', format: 'detailed', locale: 'de',
    });
    expect((calls[0]!.init?.headers as Record<string, string>).accept).toBe('application/json');
  });

  it('getPerfume puts the encoded name in the path', async () => {
    const { calls, fetchImpl } = mockFetch({ found: true });
    await run(getPerfume({ fetch: fetchImpl }), { perfume: 'Baccarat Rouge 540', house: 'Maison Francis Kurkdjian' });
    expect(calls[0]!.url.pathname).toBe('/api/v1/perfumes/Baccarat%20Rouge%20540');
    expect(calls[0]!.url.searchParams.get('house')).toBe('Maison Francis Kurkdjian');
  });

  it('path segments cannot escape', async () => {
    const { calls, fetchImpl } = mockFetch();
    await run(explainNote({ fetch: fetchImpl }), { note: 'a/b?c#d' });
    expect(calls[0]!.url.pathname).toBe('/api/v1/notes/a%2Fb%3Fc%23d');
    expect(calls[0]!.url.search).toBe('');
  });

  it('similar, alternatives, houses, guides routes', async () => {
    const { calls, fetchImpl } = mockFetch();
    await run(findSimilarPerfumes({ fetch: fetchImpl }), { perfume: 'Dior Sauvage', steer: 'fresher', other_houses_only: true });
    expect(calls[0]!.url.pathname).toBe('/api/v1/similar');
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({ perfume: 'Dior Sauvage', steer: 'fresher', other_houses_only: 'true' });
    await run(findPerfumeAlternatives({ fetch: fetchImpl }), { perfume: 'Creed Aventus', closeness: 'very close' });
    expect(calls[1]!.url.pathname).toBe('/api/v1/alternatives');
    expect(calls[1]!.url.searchParams.get('closeness')).toBe('very close');
    await run(getPerfumeHouse({ fetch: fetchImpl }), { house: 'Creed' });
    expect(calls[2]!.url.pathname).toBe('/api/v1/houses/Creed');
    await run(listPerfumeHouses({ fetch: fetchImpl }), { type: 'niche', country: 'Italy', query: 'ma' });
    expect(Object.fromEntries(calls[3]!.url.searchParams)).toEqual({ type: 'niche', country: 'Italy', query: 'ma' });
    await run(searchPerfumeGuides({ fetch: fetchImpl }), { query: 'make perfume last', type: 'how-to' });
    expect(Object.fromEntries(calls[4]!.url.searchParams)).toEqual({ q: 'make perfume last', type: 'how-to' });
  });

  it('honours baseUrl and headers', async () => {
    const { calls, fetchImpl } = mockFetch();
    await run(searchPerfumes({ fetch: fetchImpl, baseUrl: 'https://example.test/v1/', headers: { 'x-trace': '1' } }), { query: 'x' });
    expect(calls[0]!.url.href).toBe('https://example.test/v1/perfumes?q=x');
    expect((calls[0]!.init?.headers as Record<string, string>)['x-trace']).toBe('1');
  });
});

describe('responses', () => {
  it('returns the parsed body', async () => {
    const body = { results: [{ perfume: { name: 'Delina' } }], total: 1 };
    const { fetchImpl } = mockFetch(body);
    expect(await run(searchPerfumes({ fetch: fetchImpl }), { query: 'delina' })).toEqual(body);
  });

  it('a 404 returns found:false with suggestions instead of throwing', async () => {
    const body = { found: false, suggestions: ['Delina'] };
    const { fetchImpl } = mockFetch(body, 404);
    expect(await run(getPerfume({ fetch: fetchImpl }), { perfume: 'Delinaa' })).toEqual(body);
  });

  it('other errors throw PerfumeApiError with the API message', async () => {
    const { fetchImpl } = mockFetch({ error: { code: 'rate_limited', message: 'slow down' } }, 429);
    await expect(run(searchPerfumes({ fetch: fetchImpl }), { query: 'x' })).rejects.toMatchObject({
      name: 'PerfumeApiError', status: 429, code: 'rate_limited', message: 'slow down',
    });
    expect(new PerfumeApiError(500, 'x', 'y')).toBeInstanceOf(Error);
  });
});

describe('schemas', () => {
  it('reject values outside the enums', () => {
    const t = searchPerfumes() as any;
    expect(t.inputSchema.safeParse({ gender: 'robots' }).success).toBe(false);
    expect(t.inputSchema.safeParse({ limit: 99 }).success).toBe(false);
    expect(t.inputSchema.safeParse({ query: 'oud', gender: 'men', limit: 5 }).success).toBe(true);
  });
});

describe('buildUrl', () => {
  it('drops empty values', () => {
    expect(buildUrl('https://a/b/', '/x', { q: '', a: [], b: undefined, c: 1 })).toBe('https://a/b/x?c=1');
  });
});

describe('package hygiene', () => {
  it('has no personal names in source, tests or manifest', () => {
    const root = join(__dirname, '..');
    const files = [join(root, 'package.json'), join(root, 'README.md'), ...readdirSync(join(root, 'src')).map((f) => join(root, 'src', f)), ...readdirSync(join(root, 'examples')).map((f) => join(root, 'examples', f))];
    for (const f of files) {
      const text = readFileSync(f, 'utf8').toLowerCase();
      for (const w of ['seb' + 'astian', 'dobr' + 'incu', 'seby' + 'ddd', 'scen' + 'to']) expect(text.includes(w), `${w} in ${f}`).toBe(false);
    }
  });
});
