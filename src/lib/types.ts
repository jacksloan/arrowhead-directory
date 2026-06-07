export type BusinessStatus = 'approved' | 'pending' | 'rejected' | 'deleted';

export interface Category {
  id: string;
  shortname: string;
  name: string;
}

export interface Service {
  id: string;
  shortname: string;
  name: string;
}

export interface Business {
  id?: string;
  name: string;
  email: string | null;
  phones: string[];
  address: string | null;
  website: string | null;
  description: string | null;
  categories: Category[];
  services: Service[];
  image: string | null;
  status: BusinessStatus;
  created_at?: string;
  updated_at?: string;
}

export interface LookupSuggestion {
  id: string;
  type: 'category' | 'service';
  name: string;
  suggested_by: string;
  business_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
