import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { businessSchema } from '$lib/schemas';
import { getIsAdmin } from '$lib/server/admin';
import { buildPhones } from '$lib/utils/phones';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	const { data: businesses, error } = await locals.supabase
		.from('businesses')
		.select(`*, business_categories ( categories (*) ), business_services ( services (*) )`)
		.eq('status', 'approved')
		.order('name');

	if (error) throw new Error(error.message);

	const mapped = (businesses ?? []).map((b) => ({
		...b,
		phones: buildPhones(b),
		categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
		services: (b.business_services ?? []).map((bs: any) => bs.services)
	}));

	const form = await superValidate(zod4(businessSchema));
	const isAdmin = await getIsAdmin(locals.supabase, user?.email);
	return { businesses: mapped, user, form, isAdmin };
};

async function linkCategories(supabase: any, businessId: string, categoryIds: string[]) {
	await supabase.from('business_categories').delete().eq('business_id', businessId);
	if (categoryIds.length > 0) {
		const { error } = await supabase
			.from('business_categories')
			.insert(categoryIds.map((category_id) => ({ business_id: businessId, category_id })));
		if (error) throw new Error(error.message);
	}
}

async function linkServices(supabase: any, businessId: string, serviceIds: string[]) {
	await supabase.from('business_services').delete().eq('business_id', businessId);
	if (serviceIds.length > 0) {
		const { error } = await supabase
			.from('business_services')
			.insert(serviceIds.map((service_id) => ({ business_id: businessId, service_id })));
		if (error) throw new Error(error.message);
	}
}

export const actions: Actions = {
	sendMagicLink: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${url.origin}/login/verify` }
		});
		if (error) return fail(500, { message: error.message });
		return { message: 'Check your email for a login link.' };
	},

	signOut: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/');
	},

	updateBusiness: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Not authenticated' });

		const form = await superValidate(request, zod4(businessSchema));
		if (!form.valid) return fail(400, { form });

		const isAdminUser = await getIsAdmin(locals.supabase, user.email);
		const { id, phone_1, phone_1_type, phone_2, phone_2_type, categories, services, ...fields } =
			form.data;

		const categoryIds = categories
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const serviceIds = services
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		let query = locals.supabase
			.from('businesses')
			.update({
				...fields,
				phone_1: phone_1.trim() || null,
				phone_1_type: phone_1_type || null,
				phone_2: phone_2.trim() || null,
				phone_2_type: phone_2_type || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (!isAdminUser) query = query.eq('email', user.email!);

		const { error } = await query;
		if (error) return fail(500, { form, message: error.message });

		try {
			await linkCategories(locals.supabase, id, categoryIds);
			await linkServices(locals.supabase, id, serviceIds);
		} catch (e: any) {
			return fail(500, { form, message: e.message });
		}

		return { form };
	},

	deleteBusiness: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Not authenticated' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { message: 'Missing business id' });

		const isAdminUser = await getIsAdmin(locals.supabase, user.email);

		let query = locals.supabase
			.from('businesses')
			.update({ status: 'deleted', updated_at: new Date().toISOString() })
			.eq('id', id);

		if (!isAdminUser) query = query.eq('email', user.email!);

		const { error } = await query;
		if (error) return fail(500, { message: error.message });
		return { success: true, deleted: true, id };
	},

	suggestEdit: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Not authenticated' });

		const formData = await request.formData();
		const business_id = formData.get('business_id') as string;
		if (!business_id) return fail(400, { message: 'Missing business_id' });

		const phones = ((formData.get('phones') as string) ?? '')
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);

		// subcategories column repurposed to store all category names
		const subcategories = ((formData.get('subcategories') as string) ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		const services = ((formData.get('services') as string) ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		const { error: dbError } = await locals.supabase.from('suggested_edits').insert({
			business_id,
			suggested_by: user.email!,
			name: formData.get('name') as string,
			email: (formData.get('email') as string) || null,
			phones,
			address: (formData.get('address') as string) || null,
			website: (formData.get('website') as string) || null,
			description: (formData.get('description') as string) || null,
			category: (formData.get('category') as string) || '',
			subcategories,
			services
		});

		if (dbError) return fail(500, { message: dbError.message });
		return { success: true };
	},

	suggestLookup: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { message: 'Not authenticated' });

		const formData = await request.formData();
		const type = formData.get('type') as string;
		const name = (formData.get('name') as string)?.trim();
		const business_id = (formData.get('business_id') as string) || null;

		if (!['category', 'service'].includes(type)) {
			return fail(400, { message: 'Invalid suggestion type.' });
		}
		if (!name) return fail(400, { message: 'Name is required.' });

		const { error: dbError } = await locals.supabase.from('lookup_suggestions').insert({
			type,
			name,
			suggested_by: user.email!,
			business_id,
		});

		if (dbError) return fail(500, { message: dbError.message });
		return { success: true };
	}
};
