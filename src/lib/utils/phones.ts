import type { Phone, PhoneType } from '$lib/types';

export const PHONE_TYPES: PhoneType[] = ['mobile', 'home', 'work', 'fax'];

export const PHONE_TYPE_LABELS: Record<PhoneType, string> = {
  mobile: 'Mobile',
  home: 'Home',
  work: 'Work',
  fax: 'Fax'
};

/** Build the structured phone list from a raw businesses row's columns. */
export function buildPhones(row: {
  phone_1?: string | null;
  phone_1_type?: PhoneType | null;
  phone_2?: string | null;
  phone_2_type?: PhoneType | null;
}): Phone[] {
  const out: Phone[] = [];
  if (row.phone_1) out.push({ number: row.phone_1, type: row.phone_1_type ?? null });
  if (row.phone_2) out.push({ number: row.phone_2, type: row.phone_2_type ?? null });
  return out;
}
