import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const { data: suggestions, error: dbError } = await locals.supabase
    .from('suggested_edits')
    .select('*, businesses(*)')
    .eq('status', 'pending')
    .order('created_at');

  if (dbError) throw new Error(dbError.message);
  return { suggestions: suggestions ?? [] };
};

export const actions: Actions = {
  approveEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing id' });

    const { data: suggestion, error: loadError } = await locals.supabase
      .from('suggested_edits')
      .select('*')
      .eq('id', id)
      .single();
    if (loadError || !suggestion) return fail(404, { message: 'Suggestion not found' });

    const { error: updateError } = await locals.supabase
      .from('businesses')
      .update({
        name: suggestion.name,
        email: suggestion.email,
        phones: suggestion.phones,
        address: suggestion.address,
        website: suggestion.website,
        description: suggestion.description,
        category: suggestion.category,
        subcategories: suggestion.subcategories,
        services: suggestion.services,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion.business_id);
    if (updateError) return fail(500, { message: updateError.message });

    const { error: approveError } = await locals.supabase
      .from('suggested_edits')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (approveError) return fail(500, { message: approveError.message });

    return { success: true, id };
  },

  rejectEdit: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing id' });

    const { error: dbError } = await locals.supabase
      .from('suggested_edits')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (dbError) return fail(500, { message: dbError.message });

    return { success: true, id };
  },
};
