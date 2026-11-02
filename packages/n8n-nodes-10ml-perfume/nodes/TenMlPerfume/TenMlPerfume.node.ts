import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { properties } from './descriptions';

export class TenMlPerfume implements INodeType {
	description: INodeTypeDescription = {
		displayName: '10ML Perfume Finder',
		name: 'tenMlPerfume',
		icon: { light: 'file:10ml.svg', dark: 'file:10ml.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Search 6,000+ perfumes, note pyramids, similar scents, alternatives, notes and houses from the free 10ML Fragrance Index. No API key.',
		defaults: {
			name: '10ML Perfume Finder',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		requestDefaults: {
			baseURL: 'https://mcp.10ml.com/api/v1',
			ignoreHttpStatusErrors: true,
			headers: {
				Accept: 'application/json',
			},
		},
		properties,
	};
}
