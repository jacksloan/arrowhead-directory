import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
console.log('seeding', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env or .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const raw = readFileSync(resolve('src/data/directory.json'), 'utf-8');
const businesses = JSON.parse(raw);

const { data, error } = await supabase
  .from('businesses')
  .upsert(businesses)
  .select('id');

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`Seeded ${data.length} businesses.`);
