import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  const { data: requests, error } = await locals.supabase
    .from('feature_requests')
    .select('*, feature_request_votes(user_email)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const isAdmin = await getIsAdmin(locals.supabase, user?.email);

  return {
    requests: (requests ?? []).map((r) => ({
      ...r,
      voteCount: r.feature_request_votes.length,
      userVoted: user ? r.feature_request_votes.some((v: any) => v.user_email === user.email) : false,
    })),
    user: user ? { email: user.email ?? null } : null,
    isAdmin,
  };
};

export const actions: Actions = {
  submitRequest: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to submit a request.' });

    const formData = await request.formData();
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;

    if (!title) return fail(400, { message: 'Title is required.' });

    const { data, error: dbError } = await locals.supabase
      .from('feature_requests')
      .insert({ title, description, creator_email: user.email! })
      .select('*, feature_request_votes(user_email)')
      .single();

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request: { ...data, voteCount: 0, userVoted: false } };
  },

  vote: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to vote.' });

    const formData = await request.formData();
    const request_id = formData.get('request_id') as string;
    if (!request_id) return fail(400, { message: 'Missing request_id' });

    const { error: dbError } = await locals.supabase
      .from('feature_request_votes')
      .insert({ request_id, user_email: user.email! });

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request_id };
  },

  unvote: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'You must be logged in to unvote.' });

    const formData = await request.formData();
    const request_id = formData.get('request_id') as string;
    if (!request_id) return fail(400, { message: 'Missing request_id' });

    const { error: dbError } = await locals.supabase
      .from('feature_request_votes')
      .delete()
      .eq('request_id', request_id)
      .eq('user_email', user.email!);

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, request_id };
  },

  updateStatus: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const status = formData.get('status') as string;

    const VALID = ['open', 'planned', 'completed', 'rejected'];
    if (!VALID.includes(status)) return fail(400, { message: 'Invalid status' });

    const { error: dbError } = await locals.supabase
      .from('feature_requests')
      .update({ status })
      .eq('id', id);

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, id, status };
  },
};
