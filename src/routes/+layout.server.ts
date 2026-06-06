import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const session = locals.safeGetSession
		? await locals.safeGetSession()
		: { user: null };
	return { user: session.user ?? null };
};
