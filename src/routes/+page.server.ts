import type { PageServerLoad } from './$types';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Business } from '$lib/types';

export const load: PageServerLoad = async () => {
  const raw = readFileSync(resolve('src/data/directory.json'), 'utf-8');
  const businesses: Business[] = JSON.parse(raw);
  return { businesses };
};
