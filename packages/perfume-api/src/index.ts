/**
 * perfume-api: a small typed client for the free 10ML Fragrance Index REST API (https://mcp.10ml.com/api/v1).
 * No API key, no dependencies: it uses the global `fetch` (Node 18+, Deno, Bun, browsers).
 * Parameter and response field names are exactly the API's (snake_case); see https://mcp.10ml.com/openapi.json.
 */
import type {
  FindPerfumeAlternativesParams,
  FindPerfumeAlternativesResponse,
  FindSimilarPerfumesParams,
  FindSimilarPerfumesResponse,
  GetHouseParams,
  GetHouseResponse,
  GetPerfumeParams,
  GetPerfumeResponse,
  ExplainNoteParams,
  ExplainNoteResponse,
  ListHousesParams,
  ListHousesResponse,
  Perfume,
  SearchGuidesParams,
  SearchGuidesResponse,
  SearchPerfumesParams,
  SearchPerfumesResponse,
} from './types.js';

export * from './types.js';

export const DEFAULT_BASE_URL = 'https://mcp.10ml.com/api/v1';

export interface ClientOptions {
  /** API root, default https://mcp.10ml.com/api/v1 */
  baseUrl?: string;
  /** Your own fetch (tests, proxies, older runtimes). Default: the global fetch. */
  fetch?: typeof fetch;
  /** Abort a request after this many milliseconds. Default 15000; 0 disables. */
  timeoutMs?: number;
  /** Extra request headers. */
  headers?: Record<string, string>;
}

/** Thrown for every non-2xx answer except 404 (a 404 body is returned: it carries `found: false` and suggestions). */
export class PerfumeApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;
  constructor(status: number, code: string, message: string, body: unknown) {
    super(message);
    this.name = 'PerfumeApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | readonly string[] | undefined | null>;

/** How two or more perfumes differ; built from their profiles, since the REST API has no compare route. */
export interface PerfumeComparison {
  perfumes: Perfume[];
  /** Names that are not in the index. */
  not_found: string[];
  same_family: boolean;
  shared_notes: string[];
  shared_accords: string[];
  /** Per perfume id: the notes and accords no other compared perfume has. */
  only: Record<string, { notes: string[]; accords: string[] }>;
}

function notesOf(p: Perfume): string[] {
  const set = new Set<string>(p.key_notes.map((n) => n.toLowerCase()));
  if (p.pyramid) for (const n of [...p.pyramid.top, ...p.pyramid.heart, ...p.pyramid.base]) set.add(n.toLowerCase());
  return [...set];
}

export function createClient(options: ClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? 15000;

  async function get<T>(path: string, query: Query = {}): Promise<T> {
    const doFetch = options.fetch ?? globalThis.fetch;
    if (typeof doFetch !== 'function') throw new Error('perfume-api needs a global fetch (Node 18+) or options.fetch');
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    const qs = params.toString();
    const controller = timeoutMs > 0 ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
      const res = await doFetch(`${baseUrl}${path}${qs ? `?${qs}` : ''}`, {
        headers: { accept: 'application/json', ...options.headers },
        signal: controller?.signal,
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = text;
      }
      if (res.ok || res.status === 404) return body as T;
      const err = (body as { error?: { code?: string; message?: string } } | undefined)?.error;
      throw new PerfumeApiError(res.status, err?.code ?? 'http_error', err?.message ?? `HTTP ${res.status}`, body);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const seg = (id: string) => encodeURIComponent(id);

  const api = {
    /** Search perfumes by free text, house, notes, accords, family, audience, season, occasion or style. */
    searchPerfumes: (params: SearchPerfumesParams = {}) => get<SearchPerfumesResponse>('/perfumes', params as Query),
    /** The full profile of one perfume, by name ("Baccarat Rouge 540") or id. Unknown names return `found: false` with suggestions. */
    getPerfume: (id: string, params: GetPerfumeParams = {}) => get<GetPerfumeResponse>(`/perfumes/${seg(id)}`, params as Query),
    /** Perfumes that smell like one you name, or like a list of notes and accords. */
    similarPerfumes: (params: FindSimilarPerfumesParams) => get<FindSimilarPerfumesResponse>('/similar', params as Query),
    /** The editors' alternatives to a famous perfume, from other houses. */
    perfumeAlternatives: (params: FindPerfumeAlternativesParams) => get<FindPerfumeAlternativesResponse>('/alternatives', params as Query),
    /** What a fragrance note smells like, what it pairs with and where it leads. */
    explainNote: (id: string, params: ExplainNoteParams = {}) => get<ExplainNoteResponse>(`/notes/${seg(id)}`, params as Query),
    /** A perfume house: country, style, what it is known for, signature perfumes. */
    getHouse: (id: string, params: GetHouseParams = {}) => get<GetHouseResponse>(`/houses/${seg(id)}`, params as Query),
    /** Browse perfume houses by type, country or name fragment. */
    listHouses: (params: ListHousesParams = {}) => get<ListHousesResponse>('/houses', params as Query),
    /** 10ML perfume guides and articles to read or cite. */
    searchGuides: (params: SearchGuidesParams = {}) => get<SearchGuidesResponse>('/guides', params as Query),
    /**
     * Compare 2 to 4 perfumes. The REST API has no compare route, so this fetches each profile with getPerfume
     * and diffs notes and accords locally.
     */
    async comparePerfumes(names: string[], params: GetPerfumeParams = {}): Promise<PerfumeComparison> {
      if (names.length < 2 || names.length > 4) throw new RangeError('comparePerfumes takes 2 to 4 perfumes');
      const answers = await Promise.all(names.map((name) => api.getPerfume(name, params)));
      const perfumes: Perfume[] = [];
      const not_found: string[] = [];
      answers.forEach((a, i) => (a.found && a.perfume ? perfumes.push(a.perfume) : not_found.push(names[i]!)));
      const notes = perfumes.map(notesOf);
      const accords = perfumes.map((p) => p.accords.map((a) => a.toLowerCase()));
      const inAll = (lists: string[][]) => (lists[0] ?? []).filter((x) => lists.length > 0 && lists.every((l) => l.includes(x)));
      const only: PerfumeComparison['only'] = {};
      perfumes.forEach((p, i) => {
        const others = (lists: string[][]) => new Set(lists.filter((_, j) => j !== i).flat());
        const on = others(notes);
        const oa = others(accords);
        only[p.id] = { notes: notes[i]!.filter((n) => !on.has(n)), accords: accords[i]!.filter((a) => !oa.has(a)) };
      });
      return {
        perfumes,
        not_found,
        same_family: perfumes.length > 1 && perfumes.every((p) => p.family === perfumes[0]!.family),
        shared_notes: perfumes.length > 1 ? inAll(notes) : [],
        shared_accords: perfumes.length > 1 ? inAll(accords) : [],
        only,
      };
    },
  };
  return api;
}

export type PerfumeApiClient = ReturnType<typeof createClient>;

const defaultClient = createClient();
export const searchPerfumes = defaultClient.searchPerfumes;
export const getPerfume = defaultClient.getPerfume;
export const similarPerfumes = defaultClient.similarPerfumes;
export const perfumeAlternatives = defaultClient.perfumeAlternatives;
export const explainNote = defaultClient.explainNote;
export const getHouse = defaultClient.getHouse;
export const listHouses = defaultClient.listHouses;
export const searchGuides = defaultClient.searchGuides;
export const comparePerfumes = defaultClient.comparePerfumes;
