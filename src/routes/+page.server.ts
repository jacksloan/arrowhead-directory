import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { businessSchema } from '$lib/schemas';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  const { data: businesses, error } = await locals.supabase
    .from('businesses')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);

  const form = await superValidate(zod4(businessSchema));
  return { businesses: businesses ?? [], user, form };
};

export const actions: Actions = {
  sendMagicLink: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${url.origin}/login/verify` },
    });
    if (error) return fail(500, { message: error.message });
    return { message: 'Check your email for a login link.' };
  },

  signOut: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/');
  },

  updateBusiness: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { message: 'Not authenticated' });

    const form = await superValidate(request, zod4(businessSchema));
    if (!form.valid) return fail(400, { form });

    const { id, phones, subcategories, services, ...fields } = form.data;

    const { error } = await locals.supabase
      .from('businesses')
      .update({
        ...fields,
        phones: phones.split(',').map((p: string) => p.trim()).filter(Boolean),
        subcategories: subcategories.split(',').map((s: string) => s.trim()).filter(Boolean),
        services: services.split(',').map((s: string) => s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('email', user.email);

    if (error) return fail(500, { form, message: error.message });
    return { form };
  },
};
