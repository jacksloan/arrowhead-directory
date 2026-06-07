import type { Category, Service } from '$lib/types';

let categories = $state<Category[]>([]);
let services = $state<Service[]>([]);
let loaded = $state(false);
let loading = false;

export const lookupStore = {
	get categories() { return categories; },
	get services() { return services; },
	get loaded() { return loaded; }
};

export async function ensureLookupLoaded() {
	if (loaded || loading) return;
	loading = true;
	try {
		const res = await fetch('/api/lookup');
		const data = await res.json();
		categories = data.categories ?? [];
		services = data.services ?? [];
		loaded = true;
	} finally {
		loading = false;
	}
}
