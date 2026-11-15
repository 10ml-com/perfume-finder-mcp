import {
	NodeApiError,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

/**
 * The API answers 404 with a useful body (`found: false` plus spelling suggestions), so the node asks n8n
 * not to fail on status codes and fails here on everything except 404.
 */
export function failOnApiError(
	context: Pick<IExecuteSingleFunctions, 'getNode'>,
	response: IN8nHttpFullResponse,
): void {
	const status = response.statusCode;
	if (status < 400 || status === 404) return;
	const error = (response.body as { error?: { message?: string } } | undefined)?.error;
	throw new NodeApiError(context.getNode(), response as unknown as JsonObject, {
		message: error?.message ?? `10ML Perfume Finder answered HTTP ${status}`,
		httpCode: String(status),
	});
}

/** For single-answer operations (one perfume, one note, one house). */
export async function singleOutput(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	failOnApiError(this, response);
	return items;
}

/**
 * For list operations: one n8n item per entry of `key` (results, alternatives, houses, guides).
 * `unknownStart` marks an empty answer that explains itself (an unknown starting perfume comes back
 * with no entries and a message): that answer is passed through as one item. Any other empty list
 * is an ordinary zero-result search and gives no items.
 */
export function listOutput(key: string, unknownStart?: (answer: Record<string, unknown>) => boolean) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		failOnApiError(this, response);
		const out: INodeExecutionData[] = [];
		for (const item of items) {
			const entries = (item.json as Record<string, unknown>)[key];
			if (!Array.isArray(entries)) {
				out.push(item); // an unexpected shape (found: false): pass it through rather than lose it
				continue;
			}
			const answer = item.json as Record<string, unknown>;
			if (entries.length === 0 && unknownStart?.(answer)) {
				out.push(item);
				continue;
			}
			for (const entry of entries)
				out.push({ json: entry as JsonObject, pairedItem: item.pairedItem });
		}
		return out;
	};
}

const MAX_PAGES = 500;

/**
 * Pagination for list operations. A list answer carries `next_cursor` (missing on the last page) and
 * the API takes it back as `cursor`. Return All reads every page; Limit reads pages until it has enough
 * results and trims the last one. `pageMax` is the most results the route returns per page.
 */
export function followCursor(pageMax: number) {
	return async function (
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		// maxResults is set by the Limit parameter, which is only shown while Return All is off
		let limit: number | undefined;
		if (requestOptions.maxResults !== undefined) {
			const parsed = parseInt(String(requestOptions.maxResults), 10);
			limit = parsed >= 1 ? parsed : 1;
		}
		const results: INodeExecutionData[] = [];
		const postReceive = requestOptions.postReceive;
		const qs = { ...(requestOptions.options.qs as IDataObject), limit: Math.min(limit ?? pageMax, pageMax) };
		let cursor: string | undefined;
		for (let page = 0; page < MAX_PAGES; page++) {
			// The results are split into items by the operation's own step, so the cursor is read from
			// the raw answer by a step in front of it.
			let next: unknown;
			const readCursor = async (items: INodeExecutionData[], response: IN8nHttpFullResponse) => {
				next = (response.body as IDataObject | undefined)?.next_cursor;
				return items;
			};
			requestOptions.postReceive = [
				{ data: { parameterValue: undefined }, actions: [readCursor] },
				...postReceive,
			];
			requestOptions.options.qs = cursor ? { ...qs, cursor } : { ...qs };
			results.push(...(await this.makeRoutingRequest(requestOptions)));
			if (limit !== undefined && results.length >= limit) break;
			if (typeof next !== 'string' || next === '' || next === cursor) break;
			cursor = next;
		}
		requestOptions.postReceive = postReceive;
		return limit !== undefined ? results.slice(0, limit) : results;
	};
}
