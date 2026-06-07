import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { businessSchema } from '$lib/schemas';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const { data: businesses, error } = await locals.supabase
		.from('businesses')
		.select('*')
		.eq('status', 'approved')
		.order('category')
		.order('name');

	if (error) throw new Error(error.message);

	const form = await superValidate(zod4(businessSchema));
	return { businesses: businesses ?? [], user, form };
};

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
		const { id, phones, subcategories, services, ...fields } = form.data;

		let query = locals.supabase
			.from('businesses')
			.update({
				...fields,
				phones: phones
					.split(',')
					.map((p: string) => p.trim())
					.filter(Boolean),
				subcategories: subcategories
					.split(',')
					.map((s: string) => s.trim())
					.filter(Boolean),
				services: services
					.split(',')
					.map((s: string) => s.trim())
					.filter(Boolean),
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (!isAdminUser) {
			query = query.eq('email', user.email!);
		}

		const { error } = await query;
		if (error) return fail(500, { form, message: error.message });
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

		if (!isAdminUser) {
			query = query.eq('email', user.email!);
		}

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
			category: formData.get('category') as string,
			subcategories,
			services
		});

		if (dbError) return fail(500, { message: dbError.message });
		return { success: true };
	}
};
