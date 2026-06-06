import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

	const { data: admins, error: dbError } = await locals.supabase
		.from('admins')
		.select('email')
		.order('email');

	if (dbError) throw new Error(dbError.message);
	return { admins: admins ?? [] };
};

export const actions: Actions = {
	addAdmin: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();

		if (!email || !email.includes('@')) {
			return fail(400, { message: 'A valid email address is required.' });
		}

		const { error: dbError } = await locals.supabase.from('admins').insert({ email });

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { message: `${email} is already an admin.` });
			return fail(500, { message: dbError.message });
		}
		return { success: true, email };
	},

	removeAdmin: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();

		if (email === user!.email) return fail(400, { message: "You can't remove yourself." });

		const { error: dbError } = await locals.supabase.from('admins').delete().eq('email', email);

		if (dbError) return fail(500, { message: dbError.message });
		return { success: true, email };
	},
};
