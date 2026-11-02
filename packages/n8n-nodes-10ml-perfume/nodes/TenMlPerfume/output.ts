import {
	NodeApiError,
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
 * For list operations: one n8n item per entry of `key` (results, alternatives, houses, guides), unless the
 * "Return Full Response" option is on (keeps total, next_cursor and the rest of the envelope).
 */
export function listOutput(key: string) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		failOnApiError(this, response);
		if (this.getNodeParameter('options.returnFullResponse', false) === true) return items;
		const out: INodeExecutionData[] = [];
		for (const item of items) {
			const entries = (item.json as Record<string, unknown>)[key];
			if (!Array.isArray(entries)) {
				out.push(item); // an unexpected shape: pass it through rather than lose it
				continue;
			}
			for (const entry of entries)
				out.push({ json: entry as JsonObject, pairedItem: item.pairedItem });
		}
		return out;
	};
}
