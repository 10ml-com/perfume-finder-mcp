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
const { listOutput, singleOutput, failOnApiError } = require(join(root, 'dist/nodes/TenMlPerfume/output.js'));
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
	assert.equal(pkg.version, '1.0.5');
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
			options: { detailed: true, maxResults: 3, locale: 'de', cursor: 'bzE' },
		},
	);
	assert.deepEqual(full.qs, {
		q: 'fresh citrus', gender: 'men', notes_include: 'oud,sandalwood', iconic: true, accords: 'woody',
		format: 'detailed', limit: 3, locale: 'de', cursor: 'bzE',
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
	const alt = buildRequest('perfume', 'findAlternatives', { perfume: 'Creed Aventus' }, { filters: { closeness: 'very close' }, options: { maxResults: 2 } });
	assert.equal(alt.url, '/alternatives');
	assert.deepEqual(alt.qs, { perfume: 'Creed Aventus', closeness: 'very close', limit: 2 });
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

test('list output: one item per entry, or the full envelope on request', async () => {
	const items = [{ json: { total: 2, results: [{ name: 'A' }, { name: 'B' }], next_cursor: 'x' } }];
	const split = await listOutput('results').call(ctx(), items, { statusCode: 200, body: {} });
	assert.deepEqual(split.map((i) => i.json.name), ['A', 'B']);
	const full = await listOutput('results').call(ctx({ 'options.returnFullResponse': true }), items, { statusCode: 200, body: {} });
	assert.equal(full.length, 1);
	assert.equal(full[0].json.next_cursor, 'x');
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
