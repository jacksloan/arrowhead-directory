import type { SupabaseClient } from '@supabase/supabase-js';

export async function getIsAdmin(
	supabase: SupabaseClient,
	email: string | null | undefined
): Promise<boolean> {
	if (!email) return false;
	const { data } = await supabase
		.from('admins')
		.select('email')
		.eq('email', email)
		.maybeSingle();
	return !!data;
}
