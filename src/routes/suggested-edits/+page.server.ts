import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

function toShortname(name: string): string {
	return name.toLowerCase().replace(/\s+/g, '_');
}

async function upsertAndLinkCategories(supabase: any, businessId: string, categoryNames: string[]) {
	const ids: string[] = [];
	for (const name of categoryNames) {
		const shortname = toShortname(name);
		const { data, error: e } = await supabase
			.from('categories')
			.upsert({ shortname, name }, { onConflict: 'shortname' })
			.select('id')
			.single();
		if (e) throw new Error(e.message);
		ids.push(data.id);
	}
	await supabase.from('business_categories').delete().eq('business_id', businessId);
	if (ids.length > 0) {
		const { error: e } = await supabase
			.from('business_categories')
			.insert(ids.map((category_id) => ({ business_id: businessId, category_id })));
		if (e) throw new Error(e.message);
	}
}

async function upsertAndLinkServices(supabase: any, businessId: string, serviceNames: string[]) {
	const ids: string[] = [];
	for (const name of serviceNames) {
		const shortname = toShortname(name);
		const { data, error: e } = await supabase
			.from('services')
			.upsert({ shortname, name }, { onConflict: 'shortname' })
			.select('id')
			.single();
		if (e) throw new Error(e.message);
		ids.push(data.id);
	}
	await supabase.from('business_services').delete().eq('business_id', businessId);
	if (ids.length > 0) {
		const { error: e } = await supabase
			.from('business_services')
			.insert(ids.map((service_id) => ({ business_id: businessId, service_id })));
		if (e) throw new Error(e.message);
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

	const { data: suggestions, error: dbError } = await locals.supabase
		.from('suggested_edits')
		.select(`
			*,
			businesses (
				*,
				business_categories ( categories (*) ),
				business_services ( services (*) )
			)
		`)
		.eq('status', 'pending')
		.order('created_at');

	if (dbError) throw new Error(dbError.message);

	const mapped = (suggestions ?? []).map((s) => ({
		...s,
		businesses: s.businesses
			? {
					...s.businesses,
					categories: (s.businesses.business_categories ?? []).map((bc: any) => bc.categories),
					services: (s.businesses.business_services ?? []).map((bs: any) => bs.services)
				}
			: null
	}));

	return { suggestions: mapped };
};

export const actions: Actions = {
	approveEdit: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'Missing id' });

		const { data: suggestion, error: loadError } = await locals.supabase
			.from('suggested_edits')
			.select('*')
			.eq('id', id)
			.single();
		if (loadError || !suggestion) return fail(404, { message: 'Suggestion not found' });

		const { error: updateError } = await locals.supabase
			.from('businesses')
			.update({
				name: suggestion.name,
				email: suggestion.email,
				phones: suggestion.phones,
				address: suggestion.address,
				website: suggestion.website,
				description: suggestion.description,
				updated_at: new Date().toISOString()
			})
			.eq('id', suggestion.business_id);
		if (updateError) return fail(500, { message: updateError.message });

		try {
			await upsertAndLinkCategories(
				locals.supabase,
				suggestion.business_id,
				suggestion.subcategories ?? []
			);
			await upsertAndLinkServices(
				locals.supabase,
				suggestion.business_id,
				suggestion.services ?? []
			);
		} catch (e: any) {
			return fail(500, { message: e.message });
		}

		const { error: approveError } = await locals.supabase
			.from('suggested_edits')
			.update({ status: 'approved', updated_at: new Date().toISOString() })
			.eq('id', id);
		if (approveError) return fail(500, { message: approveError.message });

		return { success: true, id };
	},

	rejectEdit: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'Missing id' });

		const { error: dbError } = await locals.supabase
			.from('suggested_edits')
			.update({ status: 'rejected', updated_at: new Date().toISOString() })
			.eq('id', id);
		if (dbError) return fail(500, { message: dbError.message });

		return { success: true, id };
	}
};
