import type { LayoutServerLoad } from './$types';
import { getIsAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const isAdmin = await getIsAdmin(locals.supabase, user?.email);
	return {
		user: user ? { email: user.email ?? null } : null,
		isAdmin,
	};
};
