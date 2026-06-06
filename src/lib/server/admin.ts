import { ADMIN_EMAILS } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export function getAdminEmails(): string[] {
	return ADMIN_EMAILS?.split(',').map((e) => e.trim()).filter(Boolean) ?? [];
}

export function isAdmin(email: string | null | undefined): boolean {
	if (!email) return false;
	return getAdminEmails().includes(email);
}

export function createAdminSupabaseClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false },
	});
}
