import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';
import type { BusinessStatus } from '$lib/types';

const VALID_STATUSES: BusinessStatus[] = ['approved', 'pending', 'rejected'];

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

	const { data: businesses, error: dbError } = await locals.supabase
		.from('businesses')
		.select('*')
		.eq('status', 'pending')
		.order('created_at');

	if (dbError) throw new Error(dbError.message);
	return { businesses: businesses ?? [] };
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const status = formData.get('status') as string;

		if (!id) return fail(400, { message: 'Missing business id' });
		if (!VALID_STATUSES.includes(status as BusinessStatus)) {
			return fail(400, { message: 'Invalid status' });
		}

		const { error: dbError } = await locals.supabase
			.from('businesses')
			.update({ status, updated_at: new Date().toISOString() })
			.eq('id', id);

		if (dbError) return fail(500, { message: dbError.message });
		return { success: true };
	},
};
