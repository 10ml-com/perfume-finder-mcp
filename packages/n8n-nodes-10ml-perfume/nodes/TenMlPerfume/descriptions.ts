import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { listOutput, singleOutput } from './output';

type Resource = 'perfume' | 'note' | 'house' | 'guide';

/** Comma-separated text field -> the API's comma list ("oud, sandalwood" -> "oud,sandalwood"). */
const commaList = '={{ $value.split(",").map((s) => s.trim()).filter(Boolean).join(",") }}';

const query = (property: string) => ({ send: { type: 'query' as const, property } });

const show = (resource: Resource, operation: string) => ({
	show: { resource: [resource], operation: [operation] },
});

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'ro', 'el', 'hu', 'cs', 'pl', 'nl', 'pt', 'sv', 'da', 'fi', 'bg', 'hr'];
const LOCALE_NAMES: Record<string, string> = {
	en: 'English',
	de: 'German',
	fr: 'French',
	es: 'Spanish',
	it: 'Italian',
	ro: 'Romanian',
	el: 'Greek',
	hu: 'Hungarian',
	cs: 'Czech',
	pl: 'Polish',
	nl: 'Dutch',
	pt: 'Portuguese',
	sv: 'Swedish',
	da: 'Danish',
	fi: 'Finnish',
	bg: 'Bulgarian',
	hr: 'Croatian',
};

const options = (values: string[]): INodePropertyOptions[] =>
	values.map((value) => ({ name: value.charAt(0).toUpperCase() + value.slice(1), value }));

const text = (
	displayName: string,
	name: string,
	property: string,
	description: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	description,
	routing: query(property),
	...extra,
});

const list = (
	displayName: string,
	name: string,
	property: string,
	description: string,
): INodeProperties =>
	text(displayName, name, property, description, {
		placeholder: 'e.g. oud, sandalwood',
		routing: { send: { type: 'query', property, value: commaList } },
	});

// The default is the first value (the lint rule cannot see a computed default).
/* eslint-disable n8n-nodes-base/node-param-default-missing */
const choice = (
	displayName: string,
	name: string,
	property: string,
	values: string[],
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'options',
	options: options(values),
	default: values[0]!,
	description,
	routing: query(property),
});
/* eslint-enable n8n-nodes-base/node-param-default-missing */

const limit = (max: number, def: number): INodeProperties => ({
	displayName: 'Limit',
	name: 'maxResults', // not "limit": the n8n lint rule wants 50 for that name, the API caps at 8 to 50 per route
	type: 'number',
	typeOptions: { minValue: 1, maxValue: max },
	default: def,
	description: 'Max number of results to return',
	routing: query('limit'),
});

const cursor: INodeProperties = text(
	'Cursor',
	'cursor',
	'cursor',
	'The next_cursor of the previous page, to read the next page (turn on Return Full Response to see it)',
);

const locale: INodeProperties = {
	displayName: 'Language',
	name: 'locale',
	type: 'options',
	options: LOCALES.map((value) => ({ name: LOCALE_NAMES[value]!, value })),
	default: 'en',
	description: 'Language of the 10ml.com links and labels',
	routing: query('locale'),
};

const detailed: INodeProperties = {
	displayName: 'Detailed Profiles',
	name: 'detailed',
	type: 'boolean',
	default: false,
	description: 'Whether to add the note pyramid, seasons, occasions and longevity to each perfume',
	routing: {
		send: { type: 'query', property: 'format', value: '={{ $value ? "detailed" : "concise" }}' },
	},
};

const returnFullResponse: INodeProperties = {
	displayName: 'Return Full Response',
	name: 'returnFullResponse',
	type: 'boolean',
	default: false,
	description:
		'Whether to return the whole answer as one item (with total and next_cursor) instead of one item per result',
};

const house: INodeProperties = text(
	'House',
	'house',
	'house',
	'Only perfumes from this house, or the house of the named perfume when the name alone is ambiguous. Example: Maison Francis Kurkdjian',
);

const collection = (
	displayName: string,
	name: 'filters' | 'options',
	resource: Resource,
	operation: string,
	fields: INodeProperties[],
): INodeProperties => ({
	displayName,
	name,
	type: 'collection',
	placeholder: name === 'filters' ? 'Add Filter' : 'Add Option',
	default: {},
	displayOptions: show(resource, operation),
	options: fields,
});

const nameField = (
	resource: Resource,
	operation: string,
	displayName: string,
	name: string,
	description: string,
	placeholder: string,
	urlPrefix: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	required: true,
	default: '',
	placeholder,
	description,
	displayOptions: show(resource, operation),
	routing: {
		request: { method: 'GET', url: `=${urlPrefix}/{{ encodeURIComponent($value) }}` },
	},
});

export const properties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Guide', value: 'guide' },
			{ name: 'House', value: 'house' },
			{ name: 'Note', value: 'note' },
			{ name: 'Perfume', value: 'perfume' },
		],
		default: 'perfume',
	},

	// ---------------- Perfume ----------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['perfume'] } },
		options: [
			{
				name: 'Find Alternatives',
				value: 'findAlternatives',
				action: 'Find alternatives to a perfume',
				description: "The editors' alternatives to a famous perfume, from other houses",
				routing: {
					request: { method: 'GET', url: '/alternatives' },
					output: { postReceive: [listOutput('alternatives')] },
				},
			},
			{
				name: 'Find Similar',
				value: 'findSimilar',
				action: 'Find perfumes similar to a perfume',
				description: 'Perfumes that smell like one you name, or like a list of notes and accords',
				routing: {
					request: { method: 'GET', url: '/similar' },
					output: { postReceive: [listOutput('results')] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a perfume',
				description: 'The profile of one perfume: note pyramid, accords, seasons, similar scents',
				routing: { output: { postReceive: [singleOutput] } },
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search perfumes',
				description:
					'Search by free text, house, notes, accords, family, audience, season, occasion or style',
				routing: {
					request: { method: 'GET', url: '/perfumes' },
					output: { postReceive: [listOutput('results')] },
				},
			},
		],
		default: 'search',
	},
	// search
	text(
		'Search Text',
		'q',
		'q',
		'A perfume name, house, notes or mood. Example: fresh citrus summer for men',
		{
			displayOptions: show('perfume', 'search'),
			placeholder: 'e.g. fresh citrus summer for men',
		},
	),
	collection('Filters', 'filters', 'perfume', 'search', [
		choice(
			'Audience',
			'gender',
			'gender',
			['men', 'women', 'unisex'],
			'Men and women also include unisex perfumes',
		),
		list('Accords', 'accords', 'accords', 'Accords that must be present (comma-separated)'),
		text(
			'Family',
			'family',
			'family',
			'Fragrance family. Example: chypre, fougere, gourmand, amber, citrus',
		),
		house,
		{
			displayName: 'Iconic Only',
			name: 'iconic',
			type: 'boolean',
			default: false,
			description: "Whether to return only the editors' iconic, era-defining classics",
			routing: query('iconic'),
		},
		list(
			'Notes to Exclude',
			'notes_exclude',
			'notes_exclude',
			'None of these notes may be present (comma-separated)',
		),
		list(
			'Notes to Include',
			'notes_include',
			'notes_include',
			'Every listed note must be present (comma-separated)',
		),
		choice(
			'Occasion',
			'occasion',
			'occasion',
			['daytime', 'office', 'casual', 'evening', 'date night', 'special occasion'],
			'Occasion the perfume suits',
		),
		choice(
			'Season',
			'season',
			'season',
			['spring', 'summer', 'autumn', 'winter'],
			'Season the perfume suits',
		),
		choice(
			'Style',
			'style',
			'style',
			[
				'aquatic',
				'boozy',
				'clean',
				'creamy',
				'dark',
				'floral',
				'fresh',
				'citrusy',
				'fruity',
				'gourmand',
				'green',
				'leathery',
				'musky',
				'powdery',
				'sensual',
				'smoky',
				'spicy',
				'sweet',
				'woody',
			],
			'A style word the scent should have',
		),
	]),
	collection('Options', 'options', 'perfume', 'search', [
		cursor,
		detailed,
		limit(20, 8),
		locale,
		returnFullResponse,
	]),

	// get
	nameField(
		'perfume',
		'get',
		'Perfume',
		'perfume',
		'A perfume by name, optionally with its house. Unknown names return found=false with suggestions.',
		'e.g. Baccarat Rouge 540',
		'/perfumes',
	),
	collection('Options', 'options', 'perfume', 'get', [detailed, house, locale]),

	// find similar
	text(
		'Perfume',
		'perfume',
		'perfume',
		'A perfume to start from, by name. Leave empty and fill Notes or Accords for a perfume outside the index.',
		{
			displayOptions: show('perfume', 'findSimilar'),
			placeholder: 'e.g. Dior Sauvage',
		},
	),
	collection('Filters', 'filters', 'perfume', 'findSimilar', [
		list(
			'Accords',
			'accords',
			'accords',
			'Known accords of the starting perfume (comma-separated)',
		),
		choice(
			'Audience',
			'gender',
			'gender',
			['men', 'women', 'unisex'],
			'Only return perfumes for this audience (men and women include unisex)',
		),
		list(
			'Notes',
			'notes',
			'notes',
			'Known notes of the starting perfume (comma-separated), for a perfume outside the index',
		),
		{
			displayName: 'Other Houses Only',
			name: 'other_houses_only',
			type: 'boolean',
			default: false,
			description: 'Whether to leave out perfumes from the same house as the starting perfume',
			routing: query('other_houses_only'),
		},
		choice(
			'Steer',
			'steer',
			'steer',
			['fresher', 'sweeter', 'darker', 'lighter', 'longer_lasting', 'more_projection'],
			'Move away from the starting point in one direction',
		),
	]),
	collection('Options', 'options', 'perfume', 'findSimilar', [
		cursor,
		detailed,
		house,
		limit(15, 8),
		locale,
		returnFullResponse,
	]),

	// find alternatives
	{
		...text('Perfume', 'perfume', 'perfume', 'The famous perfume to find alternatives for', {
			displayOptions: show('perfume', 'findAlternatives'),
			placeholder: 'e.g. Creed Aventus',
		}),
		required: true,
	},
	collection('Filters', 'filters', 'perfume', 'findAlternatives', [
		choice(
			'Closeness',
			'closeness',
			'closeness',
			['very close', 'similar vibe', 'same spirit'],
			'Only alternatives at this closeness',
		),
	]),
	collection('Options', 'options', 'perfume', 'findAlternatives', [
		cursor,
		house,
		limit(10, 6),
		locale,
		returnFullResponse,
	]),

	// ---------------- Note ----------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['note'] } },
		options: [
			{
				name: 'Explain',
				value: 'explain',
				action: 'Explain a note',
				description: 'What a fragrance note smells like, what it pairs with and where it leads',
				routing: { output: { postReceive: [singleOutput] } },
			},
		],
		default: 'explain',
	},
	nameField(
		'note',
		'explain',
		'Note',
		'note',
		'The fragrance note. Names in other languages are understood.',
		'e.g. ambroxan',
		'/notes',
	),
	collection('Options', 'options', 'note', 'explain', [locale]),

	// ---------------- House ----------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['house'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a perfume house',
				description: 'A perfume house: country, style, what it is known for, signature perfumes',
				routing: { output: { postReceive: [singleOutput] } },
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many perfume houses',
				description: 'Browse perfume houses by type, country or name',
				routing: {
					request: { method: 'GET', url: '/houses' },
					output: { postReceive: [listOutput('houses')] },
				},
			},
		],
		default: 'getMany',
	},
	nameField('house', 'get', 'House', 'house', 'The perfume house', 'e.g. Creed', '/houses'),
	collection('Options', 'options', 'house', 'get', [locale]),
	collection('Filters', 'filters', 'house', 'getMany', [
		text(
			'Country',
			'country',
			'country',
			'Only houses from this country. Example: France, Italy, United Arab Emirates',
		),
		text('Name Contains', 'query', 'query', 'Part of a house name. Example: tom or maison'),
		choice(
			'Type',
			'type',
			'type',
			['designer', 'niche', 'middle-eastern', 'indie', 'celebrity'],
			'Only houses of this type',
		),
	]),
	collection('Options', 'options', 'house', 'getMany', [
		cursor,
		limit(50, 20),
		locale,
		returnFullResponse,
	]),

	// ---------------- Guide ----------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['guide'] } },
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Search guides',
				description: '10ML perfume guides and articles to read or cite, in seventeen languages',
				routing: {
					request: { method: 'GET', url: '/guides' },
					output: { postReceive: [listOutput('guides')] },
				},
			},
		],
		default: 'search',
	},
	text(
		'Search Text',
		'q',
		'q',
		'What the guide is about. Example: how to make perfume last, oud, gift',
		{
			displayOptions: show('guide', 'search'),
			placeholder: 'e.g. how to make perfume last',
		},
	),
	collection('Filters', 'filters', 'guide', 'search', [
		choice(
			'Type',
			'type',
			'type',
			['how-to', 'list', 'alternatives', 'note', 'house'],
			'How-to, list (rankings and comparisons), alternatives, note (a note explained) or house (a house mapped)',
		),
	]),
	collection('Options', 'options', 'guide', 'search', [
		cursor,
		limit(20, 8),
		locale,
		returnFullResponse,
	]),
];
