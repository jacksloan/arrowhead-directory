import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getIsAdmin } from '$lib/server/admin';
import { buildPhones } from '$lib/utils/phones';
import type { BusinessStatus } from '$lib/types';

const VALID_STATUSES: BusinessStatus[] = ['approved', 'pending', 'rejected'];

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!(await getIsAdmin(locals.supabase, user?.email))) throw error(403, 'Forbidden');

  const [{ data: businesses, error: bizError }, { data: suggestions, error: sugError }] =
    await Promise.all([
      locals.supabase
        .from('businesses')
        .select('*, business_categories ( categories (*) ), business_services ( services (*) )')
        .eq('status', 'pending')
        .order('created_at'),
      locals.supabase
        .from('lookup_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at'),
    ]);

  if (bizError) throw new Error(bizError.message);
  if (sugError) throw new Error(sugError.message);

  const mapped = (businesses ?? []).map((b: any) => ({
    ...b,
    phones: buildPhones(b),
    categories: (b.business_categories ?? []).map((bc: any) => bc.categories),
    services: (b.business_services ?? []).map((bs: any) => bs.services),
  }));

  return { businesses: mapped, suggestions: suggestions ?? [] };
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

  approveSuggestion: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing suggestion id' });

    const { data: suggestion, error: fetchError } = await locals.supabase
      .from('lookup_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !suggestion) return fail(404, { message: 'Suggestion not found' });

    const shortname = suggestion.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const table = suggestion.type === 'category' ? 'categories' : 'services';
    const { error: insertError } = await locals.supabase
      .from(table)
      .insert({ shortname, name: suggestion.name });

    if (insertError) return fail(500, { message: insertError.message });

    const { error: updateError } = await locals.supabase
      .from('lookup_suggestions')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateError) return fail(500, { message: updateError.message });
    return { success: true, id };
  },

  rejectSuggestion: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!(await getIsAdmin(locals.supabase, user?.email))) return fail(403, { message: 'Forbidden' });

    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return fail(400, { message: 'Missing suggestion id' });

    const { error: dbError } = await locals.supabase
      .from('lookup_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (dbError) return fail(500, { message: dbError.message });
    return { success: true, id };
  },
};
