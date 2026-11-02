/**
 * @10ml/ai-sdk-perfume: Vercel AI SDK tools for the free 10ML Perfume Finder (the 10ML Fragrance Index,
 * https://mcp.10ml.com/api/v1). Read-only, no API key.
 *
 *   import { generateText } from 'ai';
 *   import { perfumeTools } from '@10ml/ai-sdk-perfume';
 *
 *   const { text } = await generateText({ model, tools: perfumeTools(), prompt: 'An alternative to Baccarat Rouge 540?' });
 *
 * Every tool is also exported on its own as a factory, e.g. `searchPerfumes()`, in the shape of the AI SDK
 * tools-as-package template: `tools: { searchPerfumes: searchPerfumes() }`.
 */
import { tool } from 'ai';
import { z } from 'zod';

export const DEFAULT_BASE_URL = 'https://mcp.10ml.com/api/v1';

export interface PerfumeToolOptions {
  /** API root. Default https://mcp.10ml.com/api/v1 */
  baseUrl?: string;
  /** Your own fetch (tests, proxies, edge runtimes). Default: the global fetch. */
  fetch?: typeof fetch;
  /** Abort a request after this many milliseconds. Default 15000; 0 disables. */
  timeoutMs?: number;
  /** Extra request headers. */
  headers?: Record<string, string>;
}

/** Thrown for every non-2xx answer except 404 (a 404 body is returned: `found: false` plus suggestions). */
export class PerfumeApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PerfumeApiError';
  }
}

type Query = Record<string, string | number | boolean | readonly string[] | undefined | null>;

/** Builds the request URL: arrays join with commas, empty values are dropped. Exported for tests. */
export function buildUrl(baseUrl: string, path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params.set(key, value.join(','));
    } else params.set(key, String(value));
  }
  const qs = params.toString();
  return `${baseUrl.replace(/\/+$/, '')}${path}${qs ? `?${qs}` : ''}`;
}

async function get(options: PerfumeToolOptions, path: string, query: Query): Promise<unknown> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await doFetch(buildUrl(options.baseUrl ?? DEFAULT_BASE_URL, path, query), {
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
    if (res.ok || res.status === 404) return body;
    const err = (body as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new PerfumeApiError(res.status, err?.code ?? 'http_error', err?.message ?? `HTTP ${res.status}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const seg = (id: string) => encodeURIComponent(id);

const locale = z.enum(['en', 'de', 'fr', 'es', 'it', 'ro', 'el', 'hu', 'cs', 'pl', 'nl', 'pt', 'sv', 'da', 'fi', 'bg', 'hr']).optional().describe('Language of the 10ml.com links and labels. Default en.');
const detail = z.enum(['concise', 'detailed']).optional().describe("'concise' (default) or 'detailed' (adds note pyramid, seasons, occasions, longevity).");
const cursor = z.string().max(64).optional().describe('next_cursor from the previous page, to read the next page.');
const gender = z.enum(['men', 'women', 'unisex']);
const list = (what: string) => z.array(z.string()).optional().describe(what);

export const searchPerfumesInput = z.object({
  query: z.string().max(200).optional().describe("Free text: a perfume name, house, notes or mood, e.g. 'fresh citrus summer for men', 'Tom Ford oud'."),
  house: z.string().max(80).optional().describe("Only perfumes from this house, e.g. 'Dior', 'Maison Francis Kurkdjian', 'YSL'."),
  notes_include: list("Every listed note must be present, e.g. ['oud', 'sandalwood']."),
  notes_exclude: list("None of these notes may be present, e.g. ['patchouli']."),
  accords: list("Accords that must be present, e.g. ['woody', 'sweet']."),
  family: z.string().max(40).optional().describe("Fragrance family, e.g. 'chypre', 'fougere', 'gourmand', 'amber', 'citrus'."),
  gender: gender.optional().describe("Audience; 'men' and 'women' also include unisex perfumes."),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional().describe('Season the perfume suits.'),
  occasion: z.enum(['daytime', 'office', 'casual', 'evening', 'date night', 'special occasion']).optional().describe('Occasion the perfume suits.'),
  style: z
    .enum(['aquatic', 'boozy', 'clean', 'creamy', 'dark', 'floral', 'fresh', 'citrusy', 'fruity', 'gourmand', 'green', 'leathery', 'musky', 'powdery', 'sensual', 'smoky', 'spicy', 'sweet', 'woody'])
    .optional()
    .describe('A style word the scent should have.'),
  iconic: z.boolean().optional().describe("true = only the editors' iconic, era-defining classics (combines with every other filter)."),
  limit: z.number().int().min(1).max(20).optional().describe('Results per page, 1 to 20. Default 8.'),
  cursor,
  detail,
  locale,
});

export const getPerfumeInput = z.object({
  perfume: z.string().describe("A perfume by name, optionally with its house, e.g. 'Baccarat Rouge 540', 'Dior Sauvage', 'Delina'."),
  house: z.string().max(80).optional().describe("House, when the name alone is ambiguous, e.g. 'Creed'."),
  detail,
  locale,
});

export const findSimilarPerfumesInput = z.object({
  perfume: z.string().max(120).optional().describe("A perfume to start from, by name, e.g. 'Dior Sauvage'. Omit and pass notes or accords for a perfume outside the index."),
  house: z.string().max(80).optional().describe('House of the perfume when the name alone is ambiguous.'),
  notes: list("Known notes of the starting perfume, e.g. ['jasmine', 'saffron', 'amber']."),
  accords: list("Known accords of the starting perfume, e.g. ['amber', 'woody', 'sweet']."),
  steer: z.enum(['fresher', 'sweeter', 'darker', 'lighter', 'longer_lasting', 'more_projection']).optional().describe('Move away from the starting point in one direction.'),
  gender: gender.optional().describe('Only return perfumes for this audience (men and women include unisex).'),
  other_houses_only: z.boolean().optional().describe('true leaves out perfumes from the same house as the starting perfume.'),
  limit: z.number().int().min(1).max(15).optional().describe('Results per page, 1 to 15. Default 8.'),
  cursor,
  detail,
  locale,
});

export const findPerfumeAlternativesInput = z.object({
  perfume: z.string().max(120).describe("The famous perfume to find alternatives for, e.g. 'Creed Aventus', 'Baccarat Rouge 540', 'Delina'."),
  house: z.string().max(80).optional().describe("House of the original when the name is ambiguous, e.g. 'Parfums de Marly'."),
  closeness: z.enum(['very close', 'similar vibe', 'same spirit']).optional().describe('Only alternatives at this closeness.'),
  limit: z.number().int().min(1).max(10).optional().describe('Results per page, 1 to 10. Default 6.'),
  cursor,
  locale,
});

export const explainNoteInput = z.object({
  note: z.string().describe("The note, e.g. 'ambroxan', 'oud', 'sandalwood', 'Bergamotte' (other languages are understood)."),
  locale,
});

export const getHouseInput = z.object({
  house: z.string().describe("The house, e.g. 'Creed', 'YSL', 'Maison Francis Kurkdjian', 'Parfums de Marly'."),
  locale,
});

export const listHousesInput = z.object({
  type: z.enum(['designer', 'niche', 'middle-eastern', 'indie', 'celebrity']).optional().describe('Only houses of this type.'),
  country: z.string().max(40).optional().describe("Only houses from this country, e.g. 'France', 'Italy', 'United Arab Emirates'."),
  query: z.string().max(60).optional().describe("Part of a house name, e.g. 'tom' or 'maison'."),
  limit: z.number().int().min(1).max(50).optional().describe('Results per page, 1 to 50. Default 20.'),
  cursor,
  locale,
});

export const searchGuidesInput = z.object({
  query: z.string().max(120).optional().describe("What the guide is about, e.g. 'how to make perfume last', 'oud', 'Creed Aventus alternatives', 'gift'."),
  type: z.enum(['how-to', 'list', 'alternatives', 'note', 'house']).optional().describe('how-to, list (rankings and comparisons), alternatives, note (a note explained) or house (a house mapped).'),
  limit: z.number().int().min(1).max(20).optional().describe('Results per page, 1 to 20. Default 8.'),
  cursor,
  locale,
});

/** Tool argument names that differ from the API's parameter names: `query` is `q`, `detail` is `format`. */
const toQuery = (args: Record<string, unknown>, rename: Record<string, string> = { query: 'q', detail: 'format' }): Query => {
  const out: Query = {};
  for (const [k, v] of Object.entries(args)) out[rename[k] ?? k] = v as Query[string];
  return out;
};

/** Search perfumes by free text, house, notes, accords, family, audience, season, occasion or style. */
export const searchPerfumes = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Find perfumes in the 10ML Fragrance Index (6,000+ perfumes). Use for 'a fresh citrus summer cologne for men', 'vanilla and oud perfumes without patchouli', 'Dior perfumes for the office' or 'iconic chypres'. Returns matching perfumes with house, family, accords and key notes. Not for the full profile of one named perfume (use getPerfume) or look-alikes (use findSimilarPerfumes).",
    inputSchema: searchPerfumesInput,
    execute: async (args) => get(options, '/perfumes', toQuery(args)),
  });

/** The full profile of one perfume: note pyramid, accords, seasons and similar scents. */
export const getPerfume = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Get the profile of one perfume by name: house, year, family, accords, the note pyramid (top, heart and base notes), seasons, occasions and similar perfumes. Use for 'what notes are in Delina?' or 'what does Baccarat Rouge 540 smell like?'. An unknown name returns found=false with spelling suggestions.",
    inputSchema: getPerfumeInput,
    execute: async ({ perfume, ...rest }) => get(options, `/perfumes/${seg(perfume)}`, toQuery(rest)),
  });

/** Perfumes that smell like one you name, or like a list of notes and accords. */
export const findSimilarPerfumes = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Find perfumes that smell like a perfume the user loves, ranked by shared notes, accords and style, with the reason for each. Use for 'what smells like Dior Sauvage but fresher?' (steer='fresher') or, for a perfume outside the index, pass its notes and accords. Not for the editors' alternatives to a famous perfume from other houses (use findPerfumeAlternatives).",
    inputSchema: findSimilarPerfumesInput,
    execute: async (args) => get(options, '/similar', toQuery(args)),
  });

/** The editors' alternatives to a famous perfume, from other houses. */
export const findPerfumeAlternatives = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Find alternatives to a famous perfume from other houses, as picked by 10ML's fragrance editors, each marked 'very close', 'similar vibe' or 'same spirit'. Use for 'an alternative to Creed Aventus' or 'something like Baccarat Rouge 540 from another house'.",
    inputSchema: findPerfumeAlternativesInput,
    execute: async (args) => get(options, '/alternatives', toQuery(args)),
  });

/** What a fragrance note smells like, what it pairs with and which perfumes it leads. */
export const explainNote = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Explain a fragrance note: what it smells like, its family and origin, what it pairs with and the perfumes it leads. Use for 'what does ambroxan smell like?' or 'what goes well with oud?'. Note names in other languages are understood.",
    inputSchema: explainNoteInput,
    execute: async ({ note, ...rest }) => get(options, `/notes/${seg(note)}`, toQuery(rest)),
  });

/** A perfume house: country, style, what it is known for and its signature perfumes. */
export const getPerfumeHouse = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Get one perfume house: country, type (designer, niche, middle-eastern), style, what it is known for and its signature perfumes. Use for 'tell me about Creed' or 'what is Maison Francis Kurkdjian known for?'.",
    inputSchema: getHouseInput,
    execute: async ({ house, ...rest }) => get(options, `/houses/${seg(house)}`, toQuery(rest)),
  });

/** Browse perfume houses by type, country or name fragment. */
export const listPerfumeHouses = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Browse perfume houses by type (designer, niche, middle-eastern, indie, celebrity), country or part of a name. Use for 'which niche houses are from Italy?'.",
    inputSchema: listHousesInput,
    execute: async (args) => get(options, '/houses', toQuery(args, {})),
  });

/** 10ML perfume guides and articles to read or cite. */
export const searchPerfumeGuides = (options: PerfumeToolOptions = {}) =>
  tool({
    description:
      "Find 10ML perfume guides and articles to read or cite, in seventeen languages: how-tos, rankings, alternatives guides, notes explained and house guides. Use for 'how do I make perfume last longer?' or 'a guide to oud perfumes'.",
    inputSchema: searchGuidesInput,
    execute: async (args) => get(options, '/guides', toQuery(args)),
  });

/** All eight tools as a ready-made AI SDK tool set: `generateText({ model, tools: perfumeTools(), ... })`. */
export const perfumeTools = (options: PerfumeToolOptions = {}) => ({
  searchPerfumes: searchPerfumes(options),
  getPerfume: getPerfume(options),
  findSimilarPerfumes: findSimilarPerfumes(options),
  findPerfumeAlternatives: findPerfumeAlternatives(options),
  explainNote: explainNote(options),
  getPerfumeHouse: getPerfumeHouse(options),
  listPerfumeHouses: listPerfumeHouses(options),
  searchPerfumeGuides: searchPerfumeGuides(options),
});

export type PerfumeTools = ReturnType<typeof perfumeTools>;
