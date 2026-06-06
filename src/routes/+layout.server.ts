import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// locals.safeGetSession is added by the auth agent (Task 6, feat/auth branch)
	// Until auth lands, return null user — layout still renders fine
	const session =
		'safeGetSession' in locals
			? await (locals as any).safeGetSession()
			: { user: null };
	return { user: session.user ?? null };
};
