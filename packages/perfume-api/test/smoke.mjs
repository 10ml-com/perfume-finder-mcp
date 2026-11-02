// Live smoke test against https://mcp.10ml.com/api/v1 (needs internet). Run: npm run smoke  (after npm run build)
import assert from 'node:assert/strict';
import { PerfumeApiError, comparePerfumes, explainNote, getHouse, getPerfume, listHouses, perfumeAlternatives, searchGuides, searchPerfumes, similarPerfumes } from '../dist/index.js';

const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  console.log(`ok  ${name} (${Date.now() - t} ms)`);
};

await step('searchPerfumes', async () => {
  const r = await searchPerfumes({ q: 'fresh citrus summer cologne for men', limit: 3 });
  assert.ok(r.total > 0 && r.results.length === 3 && r.results[0].accords.length > 0);
});
await step('searchPerfumes notes_include array + gender', async () => {
  const r = await searchPerfumes({ notes_include: ['vanilla', 'oud'], gender: 'men', limit: 2 });
  assert.ok(Array.isArray(r.results));
});
await step('getPerfume', async () => {
  const r = await getPerfume('Baccarat Rouge 540');
  assert.equal(r.found, true);
  assert.ok(r.perfume.pyramid || r.perfume.key_notes.length);
});
await step('getPerfume unknown -> found:false', async () => assert.equal((await getPerfume('zzzzqq')).found, false));
await step('similarPerfumes', async () => {
  const r = await similarPerfumes({ perfume: 'Sauvage', limit: 3 });
  assert.ok(r.results.length > 0);
});
await step('similarPerfumes from notes', async () => {
  const r = await similarPerfumes({ notes: ['saffron', 'cedar'], limit: 2 });
  assert.ok(r.results.length > 0);
});
await step('perfumeAlternatives', async () => {
  const r = await perfumeAlternatives({ perfume: 'Baccarat Rouge 540', limit: 3 });
  assert.ok(r.alternatives.length > 0);
});
await step('explainNote', async () => assert.equal((await explainNote('ambroxan')).found, true));
await step('getHouse', async () => assert.equal((await getHouse('Creed')).found, true));
await step('listHouses', async () => assert.ok((await listHouses({ type: 'niche', limit: 3 })).houses.length === 3));
await step('searchGuides', async () => assert.ok((await searchGuides({ q: 'layering', limit: 2 })).guides.length > 0));
await step('comparePerfumes', async () => {
  const r = await comparePerfumes(['Creed Aventus', 'Dior Sauvage']);
  assert.equal(r.perfumes.length, 2);
});
await step('invalid request throws PerfumeApiError', async () => {
  await assert.rejects(searchPerfumes({ limit: 99 }), (e) => e instanceof PerfumeApiError && e.status === 400);
});
console.log('perfume-api live smoke: all passed');
