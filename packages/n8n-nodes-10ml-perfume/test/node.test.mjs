// Unit tests for the declarative node: the routing in the node description is evaluated by a small
// interpreter (url templates, query properties, value expressions) and compared with the OpenAPI spec.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { TenMlPerfume } = require(join(root, 'dist/nodes/TenMlPerfume/TenMlPerfume.node.js'));
const { listOutput, singleOutput, failOnApiError, followCursor } = require(join(root, 'dist/nodes/TenMlPerfume/output.js'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const description = new TenMlPerfume().description;
const props = description.properties;

const specPath = join(root, '../perfume-api/spec/openapi.json');
const spec = existsSync(specPath) ? JSON.parse(readFileSync(specPath, 'utf8')) : undefined;

/** Evaluate an n8n "={{ ... }}" / "=text {{ ... }}" expression with $value. */
function evalExpr(expr, $value) {
	if (typeof expr !== 'string' || !expr.startsWith('=')) return expr;
	const body = expr.slice(1);
	const whole = body.match(/^\{\{([\s\S]*)\}\}$/);
	if (whole) return new Function('$value', `return (${whole[1]});`)($value);
	return body.replace(/\{\{([\s\S]*?)\}\}/g, (_, code) => String(new Function('$value', `return (${code});`)($value)));
}

const shown = (p, resource, operation) => {
	const s = p.displayOptions?.show;
	if (!s) return true;
	return (!s.resource || s.resource.includes(resource)) && (!s.operation || s.operation.includes(operation));
};

/** Build the request the node sends for one operation. `top` = top-level params, `collections` = {filters:{}, options:{}}. */
function buildRequest(resource, operation, top = {}, collections = {}) {
	const op = props
		.find((p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource))
		.options.find((o) => o.value === operation);
	const req = { method: op.routing?.request?.method, url: op.routing?.request?.url, qs: {} };
	const apply = (p, value) => {
		const r = p.routing;
		if (!r) return;
		if (r.request?.url) {
			req.url = evalExpr(r.request.url, value);
			req.method = r.request.method ?? req.method;
		}
		if (r.send?.type === 'query') req.qs[r.send.property] = r.send.value !== undefined ? evalExpr(r.send.value, value) : value;
	};
	for (const p of props) {
		if (!shown(p, resource, operation) || p.type === 'collection' || p.name === 'resource' || p.name === 'operation') continue;
		if (p.name in top) apply(p, top[p.name]);
	}
	for (const [cname, values] of Object.entries(collections)) {
		const c = props.find((p) => p.type === 'collection' && p.name === cname && shown(p, resource, operation));
		assert.ok(c, `collection ${cname} for ${resource}.${operation}`);
		for (const [k, v] of Object.entries(values)) {
			const field = c.options.find((o) => o.name === k);
			assert.ok(field, `field ${k} in ${cname}`);
			apply(field, v);
		}
	}
	return req;
}

test('manifest follows n8n community node conventions', () => {
	assert.equal(pkg.name, 'n8n-nodes-10ml-perfume');
	assert.equal(pkg.version, '2.0.0');
	assert.ok(pkg.keywords.includes('n8n-community-node-package'));
	assert.equal(pkg.license, 'MIT');
	assert.equal(pkg.author.name, '10ML Team');
	assert.equal(pkg.homepage, 'https://10ml.com/perfume-mcp-server');
	assert.match(pkg.repository.url, /^git\+https:\/\/github\.com\/10ml-com\/perfume-finder-mcp\.git$/);
	assert.equal(pkg.n8n.n8nNodesApiVersion, 1);
	for (const file of pkg.n8n.nodes) assert.ok(existsSync(join(root, file)), file);
	assert.ok(existsSync(join(root, 'dist/nodes/TenMlPerfume/10ml.svg')));
	assert.ok(existsSync(join(root, 'dist/nodes/TenMlPerfume/10ml.dark.svg')));
	assert.deepEqual(description.credentials, []);
	assert.equal(description.requestDefaults.baseURL, 'https://mcp.10ml.com/api/v1');
});

test('no personal names in the package', () => {
	const files = ['package.json', 'README.md', 'nodes/TenMlPerfume/descriptions.ts', 'nodes/TenMlPerfume/output.ts', 'nodes/TenMlPerfume/TenMlPerfume.node.ts'];
	for (const f of files) {
		const text = readFileSync(join(root, f), 'utf8').toLowerCase();
		for (const w of ['seb' + 'astian', 'dobr' + 'incu', 'seby' + 'ddd', 'scen' + 'to']) assert.ok(!text.includes(w), `${w} in ${f}`);
	}
});

test('perfume search: text, filters and options map to the API query', () => {
	const r = buildRequest('perfume', 'search', { q: 'fresh citrus' });
	assert.equal(r.url, '/perfumes');
	assert.equal(r.method, 'GET');
	const full = buildRequest(
		'perfume',
		'search',
		{ q: 'fresh citrus' },
		{
			filters: { gender: 'men', notes_include: 'oud, sandalwood ,', iconic: true, accords: 'woody' },
			options: { detailed: true, locale: 'de' },
		},
	);
	assert.deepEqual(full.qs, {
		q: 'fresh citrus', gender: 'men', notes_include: 'oud,sandalwood', iconic: true, accords: 'woody',
		format: 'detailed', locale: 'de',
	});
	assert.deepEqual(r.qs, { q: 'fresh citrus' });
});

test('get perfume / note / house put the encoded name in the path', () => {
	assert.equal(buildRequest('perfume', 'get', { perfume: 'Baccarat Rouge 540' }).url, '/perfumes/Baccarat%20Rouge%20540');
	assert.equal(buildRequest('note', 'explain', { note: 'a/b?c' }).url, '/notes/a%2Fb%3Fc');
	assert.equal(buildRequest('house', 'get', { house: 'Maison Francis Kurkdjian' }).url, '/houses/Maison%20Francis%20Kurkdjian');
	assert.deepEqual(buildRequest('perfume', 'get', { perfume: 'Delina' }, { options: { house: 'Parfums de Marly', detailed: false } }).qs, {
		house: 'Parfums de Marly', format: 'concise',
	});
});

test('similar, alternatives, houses, guides', () => {
	const sim = buildRequest('perfume', 'findSimilar', { perfume: 'Dior Sauvage' }, { filters: { steer: 'fresher', other_houses_only: true, notes: 'jasmine, saffron' } });
	assert.equal(sim.url, '/similar');
	assert.deepEqual(sim.qs, { perfume: 'Dior Sauvage', steer: 'fresher', other_houses_only: true, notes: 'jasmine,saffron' });
	const alt = buildRequest('perfume', 'findAlternatives', { perfume: 'Creed Aventus' }, { filters: { closeness: 'very close' } });
	assert.equal(alt.url, '/alternatives');
	assert.deepEqual(alt.qs, { perfume: 'Creed Aventus', closeness: 'very close' });
	const houses = buildRequest('house', 'getMany', {}, { filters: { type: 'niche', country: 'Italy', query: 'ma' } });
	assert.equal(houses.url, '/houses');
	assert.deepEqual(houses.qs, { type: 'niche', country: 'Italy', query: 'ma' });
	const guides = buildRequest('guide', 'search', { q: 'make perfume last' }, { filters: { type: 'how-to' } });
	assert.equal(guides.url, '/guides');
	assert.deepEqual(guides.qs, { q: 'make perfume last', type: 'how-to' });
});

test('every routed path and query property exists in the OpenAPI spec', { skip: !spec }, () => {
	const specParams = (route) => new Set((spec.paths[`/api/v1${route}`]?.get?.parameters ?? []).map((p) => p.name));
	const routeOf = (url) => (url.startsWith('=') ? url.replace(/^=/, '').replace(/\/\{\{.*\}\}$/, '/{id}') : url);
	const opProps = props.filter((p) => p.name === 'operation');
	let checked = 0;
	for (const opProp of opProps) {
		const resource = opProp.displayOptions.show.resource[0];
		for (const op of opProp.options) {
			let route = op.routing?.request?.url;
			const named = props.find((p) => p.routing?.request?.url && shown(p, resource, op.value));
			if (named) route = routeOf(named.routing.request.url);
			assert.ok(spec.paths[`/api/v1${route}`], `${resource}.${op.value}: ${route} is not in the spec`);
			const allowed = specParams(route);
			for (const p of props) {
				if (!shown(p, resource, op.value)) continue;
				const fields = p.type === 'collection' ? p.options : [p];
				for (const f of fields) {
					const prop = f.routing?.send?.property;
					if (prop) {
						assert.ok(allowed.has(prop), `${resource}.${op.value}: query "${prop}" is not an API parameter of ${route}`);
						checked++;
					}
				}
			}
			checked++;
		}
	}
	assert.ok(checked > 30, `only ${checked} mappings checked`);
});

test('every enum option the node offers is accepted by the spec', { skip: !spec }, () => {
	const enumsByParam = {};
	for (const path of Object.values(spec.paths))
		for (const p of path.get.parameters ?? []) if (p.schema?.enum) (enumsByParam[p.name] ??= new Set()).add(JSON.stringify(p.schema.enum));
	for (const p of props) {
		const fields = p.type === 'collection' ? p.options : [p];
		for (const f of fields) {
			const prop = f.routing?.send?.property;
			if (f.type !== 'options' || !prop || !enumsByParam[prop]) continue;
			const offered = f.options.map((o) => o.value).sort();
			const ok = [...enumsByParam[prop]].some((e) => JSON.stringify(JSON.parse(e).sort()) === JSON.stringify(offered));
			assert.ok(ok, `${prop}: node offers ${offered.join('|')}`);
		}
	}
});

const ctx = (options = {}) => ({ getNode: () => ({ name: '10ML Perfume Finder', type: 'x', typeVersion: 1, position: [0, 0], parameters: {} }), getNodeParameter: (name, def) => options[name] ?? def });

test('list output: one item per entry', async () => {
	const items = [{ json: { total: 2, results: [{ name: 'A' }, { name: 'B' }], next_cursor: 'x' } }];
	const split = await listOutput('results').call(ctx(), items, { statusCode: 200, body: {} });
	assert.deepEqual(split.map((i) => i.json.name), ['A', 'B']);
	const odd = await listOutput('results').call(ctx(), [{ json: { found: false } }], { statusCode: 200, body: {} });
	assert.equal(odd.length, 1);
});

test('a 404 passes through (found: false), other errors throw', async () => {
	const items = [{ json: { found: false, suggestions: ['Delina'] } }];
	assert.deepEqual(await singleOutput.call(ctx(), items, { statusCode: 404, body: items[0].json }), items);
	assert.deepEqual(await listOutput('results').call(ctx(), items, { statusCode: 404, body: {} }), items);
	await assert.rejects(singleOutput.call(ctx(), [], { statusCode: 429, body: { error: { code: 'rate_limited', message: 'slow down' } } }), /slow down/);
	assert.throws(() => failOnApiError(ctx(), { statusCode: 500, body: undefined }), /HTTP 500/);
	assert.doesNotThrow(() => failOnApiError(ctx(), { statusCode: 200, body: {} }));
});

// ---------- Return All and Limit ----------
const LISTS = {
	'perfume.search': { path: '/api/v1/perfumes', key: 'results' },
	'perfume.findSimilar': { path: '/api/v1/similar', key: 'results' },
	'perfume.findAlternatives': { path: '/api/v1/alternatives', key: 'alternatives' },
	'house.getMany': { path: '/api/v1/houses', key: 'houses' },
	'guide.search': { path: '/api/v1/guides', key: 'guides' },
};
const listProp = (key, name) => {
	const [resource, operation] = key.split('.');
	return props.find((p) => p.name === name && p.displayOptions?.show?.resource?.[0] === resource && p.displayOptions.show.operation?.[0] === operation);
};
const operationOf = (key) => {
	const [resource, operation] = key.split('.');
	return props.find((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === resource).options.find((o) => o.value === operation);
};
// the page size the node was built with, read back from the function by one probe request
async function pageMaxOf(key) {
	const seen = [];
	const fn = listProp(key, 'returnAll').routing.operations.pagination;
	await fn.call({ makeRoutingRequest: async (o) => { seen.push({ ...o.options.qs }); return []; } }, { options: { qs: {} }, postReceive: [] });
	return seen[0].limit;
}

// Runs a request the way n8n's routing node does: the raw answer goes through the postReceive steps.
function routed(state, api) {
	return async function makeRoutingRequest(opts) {
		const qs = { ...opts.options.qs };
		state.seen.push(qs);
		const body = api(qs);
		let items = [{ json: body }];
		for (const step of opts.postReceive)
			for (const action of step.actions) items = await action.call(ctx(), items, { statusCode: 200, body });
		return items;
	};
}
// A fake API: `total` results, at most `max` per page, a cursor that holds the offset.
const fakeApi = (total, max, key) => (qs) => {
	const at = qs.cursor ? Number(Buffer.from(qs.cursor, 'base64url').toString()) : 0;
	const size = Math.min(Number(qs.limit ?? 8), max);
	const entries = Array.from({ length: Math.min(size, total - at) }, (_, i) => ({ name: `r${at + i}` }));
	return { total, [key]: entries, ...(at + size < total ? { next_cursor: Buffer.from(String(at + size)).toString('base64url') } : {}) };
};
const optsFor = (key, maxResults) => ({ maxResults, options: { qs: { q: 'oud' } }, postReceive: [{ data: {}, actions: [operationOf(key).routing.output.postReceive[0]] }] });

test('list operations: Return All, Limit (default 50, min 1), no Cursor, Limit or Return Full Response option', () => {
	for (const key of Object.keys(LISTS)) {
		const all = listProp(key, 'returnAll');
		const limit = listProp(key, 'limit');
		assert.ok(all && limit, key);
		assert.equal(all.type, 'boolean');
		assert.equal(all.default, false);
		assert.equal(all.routing.send.paginate, true);
		assert.equal(typeof all.routing.operations.pagination, 'function');
		assert.equal(limit.type, 'number');
		assert.equal(limit.default, 50);
		assert.equal(limit.typeOptions.minValue, 1);
		assert.equal(limit.description, 'Max number of results to return');
		assert.deepEqual(limit.displayOptions.show.returnAll, [false], `${key}: Limit only while Return All is off`);
		const [resource, operation] = key.split('.');
		const options = props.find((p) => p.type === 'collection' && p.name === 'options' && shown(p, resource, operation));
		for (const gone of ['cursor', 'maxResults', 'returnFullResponse']) assert.ok(!options.options.some((o) => o.name === gone), `${key}: ${gone} is gone`);
	}
});

test('the page size of every list operation is the maximum the API allows for its route', { skip: !spec }, async () => {
	for (const [key, { path }] of Object.entries(LISTS)) {
		const limit = spec.paths[path].get.parameters.find((p) => p.name === 'limit');
		assert.equal(await pageMaxOf(key), limit.schema.maximum, key);
		assert.ok(spec.paths[path].get.parameters.some((p) => p.name === 'cursor'), `${key}: the API takes a cursor`);
	}
});

test('Return All follows next_cursor, one item per result, and keeps the query', async () => {
	for (const [key, { key: rows }] of Object.entries(LISTS)) {
		const max = await pageMaxOf(key);
		const state = { seen: [] };
		const out = await listProp(key, 'returnAll').routing.operations.pagination.call({ makeRoutingRequest: routed(state, fakeApi(max * 2 + 3, max, rows)) }, optsFor(key));
		assert.equal(out.length, max * 2 + 3, `${key}: every result`);
		assert.deepEqual(out.map((i) => i.json.name), Array.from({ length: max * 2 + 3 }, (_, i) => `r${i}`), `${key}: each result is its own item`);
		assert.equal(state.seen.length, 3);
		assert.deepEqual(state.seen[0], { q: 'oud', limit: max });
		assert.deepEqual(state.seen[2].q, 'oud');
		assert.ok(state.seen[1].cursor && state.seen[2].cursor);
		assert.ok(state.seen.every((q) => q.limit === max), 'the page size stays the same on every page');
	}
});

test('Limit stops once there are enough results and trims the last page', async () => {
	const fn = listProp('perfume.search', 'returnAll').routing.operations.pagination;
	const run = async (maxResults, total = 879) => {
		const state = { seen: [] };
		const out = await fn.call({ makeRoutingRequest: routed(state, fakeApi(total, 20, 'results')) }, optsFor('perfume.search', maxResults));
		return [out.length, state.seen.length, state.seen[0].limit];
	};
	assert.deepEqual(await run(50), [50, 3, 20]);
	assert.deepEqual(await run('45'), [45, 3, 20]);
	assert.deepEqual(await run(5), [5, 1, 5], 'a small limit asks for just that many');
	assert.deepEqual(await run(50, 12), [12, 1, 20], 'fewer results than the limit');
	assert.deepEqual(await run(undefined, 100), [100, 5, 20], 'no limit = Return All');
});

test('a Limit that resolves to 0, a negative number or text is clamped to 1', () => {
	const expr = listProp('perfume.search', 'limit').routing.output.maxResults;
	const at = (v, returnAll = false) => new Function('$value', '$parameter', `return (${expr.slice(3, -2)});`)(v, { returnAll });
	assert.deepEqual([0, -5, 'abc', undefined, 1, 7, 7.9, '25'].map((v) => at(v)), [1, 1, 1, 1, 1, 7, 7, 25]);
	// Return All switched on by an expression leaves Limit shown: no cap then (0 = unset in n8n)
	assert.equal(at(5, true), 0);
	assert.equal(at(5, 'true'), 0);
});

test('an unknown starting perfume comes back as one item with its message, not as zero items', async () => {
	const similar = { total: 0, target: { name: 'zzz', house: null, in_index: false }, results: [], message: '"zzz" is not in the index' };
	const alt = { total: 0, original: { name: 'zzz' }, alternatives: [], links: [], message: '"zzz" has no editorial alternatives' };
	const out = (key, body) => operationOf(key).routing.output.postReceive[0].call(ctx(), [{ json: body }], { statusCode: 200, body });
	assert.deepEqual((await out('perfume.findSimilar', similar)).map((i) => i.json), [similar]);
	assert.deepEqual((await out('perfume.findAlternatives', alt)).map((i) => i.json), [alt]);
	// a known perfume with results still splits; notes-only Find Similar has in_index false but results
	assert.equal((await out('perfume.findSimilar', { ...similar, target: { in_index: true }, results: [{ name: 'a' }, { name: 'b' }] })).length, 2);
	assert.equal((await out('perfume.findSimilar', { ...similar, results: [{ name: 'a' }] })).length, 1);
	// an ordinary zero-result search, and alternatives of a known original with none, stay empty
	assert.equal((await out('perfume.search', { total: 0, results: [], message: 'No perfume matches' })).length, 0);
	assert.equal((await out('perfume.findAlternatives', { total: 0, alternatives: [] })).length, 0);
	assert.equal((await out('perfume.findSimilar', { total: 0, target: { in_index: true }, results: [] })).length, 0);
});

test('an answer without a cursor, or a cursor that never changes, ends the loop; errors still throw', async () => {
	const fn = listProp('house.getMany', 'returnAll').routing.operations.pagination;
	const stuck = { seen: [] };
	const out = await fn.call({ makeRoutingRequest: routed(stuck, () => ({ houses: [{ name: 'a' }], next_cursor: 'same' })) }, optsFor('house.getMany'));
	assert.equal(stuck.seen.length, 2);
	assert.equal(out.length, 2);
	const endless = { seen: [] };
	let n = 0;
	await fn.call({ makeRoutingRequest: routed(endless, () => ({ houses: [], next_cursor: `c${++n}` })) }, optsFor('house.getMany'));
	assert.equal(endless.seen.length, 500);
	await assert.rejects(
		fn.call({ makeRoutingRequest: async (o) => { const body = { error: { message: 'slow down' } }; return listOutput('houses').call(ctx(), [{ json: body }], { statusCode: 429, body }); } }, optsFor('house.getMany')),
		/slow down/,
	);
});

// ---------- live: read-only calls against the real API ----------
const live = process.env.TENML_LIVE ? test : test.skip;
live('live pagination: Limit caps the list, Return All follows next_cursor to the end', async () => {
	const BASE = 'https://mcp.10ml.com/api/v1';
	const run = async (route, maxResults, extra) => {
		const state = { seen: [], requests: 0 };
		const makeRoutingRequest = async (opts) => {
			const url = new URL(BASE + route);
			for (const [k, v] of Object.entries(opts.options.qs)) url.searchParams.set(k, v);
			state.requests += 1;
			const res = await fetch(url, { headers: { Accept: 'application/json' } });
			assert.equal(res.status, 200, String(url));
			const body = await res.json();
			let items = [{ json: body }];
			for (const step of opts.postReceive) for (const action of step.actions) items = await action.call(ctx(), items, { statusCode: 200, body });
			return items;
		};
		const out = await listProp(extra.op, 'returnAll').routing.operations.pagination.call({ makeRoutingRequest }, { maxResults, options: { qs: extra.qs }, postReceive: [{ data: {}, actions: [operationOf(extra.op).routing.output.postReceive[0]] }] });
		return { out, requests: state.requests };
	};
	const head = await (await fetch(`${BASE}/houses?limit=1`)).json();
	const capped = await run('/houses', 120, { op: 'house.getMany', qs: {} });
	assert.equal(capped.out.length, 120);
	assert.equal(capped.requests, 3);
	console.log(`live: houses Limit 120 -> ${capped.out.length} items in ${capped.requests} requests`);
	const all = await run('/houses', undefined, { op: 'house.getMany', qs: {} });
	assert.equal(all.out.length, head.total);
	assert.equal(new Set(all.out.map((i) => JSON.stringify(i.json))).size, head.total, 'no repeated results');
	console.log(`live: houses Return All -> ${all.out.length} of ${head.total} items in ${all.requests} requests`);
	const search = await run('/perfumes', 45, { op: 'perfume.search', qs: { q: 'oud' } });
	assert.equal(search.out.length, 45);
	assert.ok(search.out.every((i) => i.json.name));
	console.log(`live: perfumes "oud" Limit 45 -> ${search.out.length} items in ${search.requests} requests`);
});
