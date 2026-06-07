import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const [{ data: categories }, { data: services }] = await Promise.all([
		locals.supabase.from('categories').select('*').order('name'),
		locals.supabase.from('services').select('*').order('name')
	]);
	return json({ categories: categories ?? [], services: services ?? [] });
};
