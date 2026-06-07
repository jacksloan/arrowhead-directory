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
