export type BusinessStatus = 'approved' | 'pending' | 'rejected' | 'deleted';

export interface Business {
  id?: string;
  name: string;
  email: string | null;
  phones: string[];
  address: string | null;
  website: string | null;
  description: string | null;
  category: string;
  subcategories: string[];
  services: string[];
  image: string | null;
  status: BusinessStatus;
  created_at?: string;
  updated_at?: string;
}
