import type { LayoutServerLoad } from './$types';
import { isAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	return {
		user: user ? { email: user.email ?? null } : null,
		isAdmin: isAdmin(user?.email),
	};
};
