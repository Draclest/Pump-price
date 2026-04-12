export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface FuelPrice {
  type: string;
  price: number;
  updated_at: string;
}

export const FUEL_TYPES = ['SP95', 'SP98', 'E10', 'E85', 'GPLc', 'Gazole'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_LABELS: Record<string, string> = {
  SP95:   'SP95',
  SP98:   'SP98',
  E10:    'E10',
  E85:    'E85',
  GPLc:   'GPL',
  Gazole: 'Diesel',
};

export interface Station {
  id: string;
  name?: string;
  brand?: string;
  brand_key?: string;
  logo_url?: string;
  brand_color?: string;
  address: string;
  city: string;
  postal_code: string;
  location: GeoPoint;
  fuels: FuelPrice[];
  services?: string[];
  is_open?: boolean | null;
  opening_hours?: string;
  opening_hours_display?: string;
  osm_id?: string;
  osm_last_updated?: string;
  distance_meters?: number;
}

export interface SearchParams {
  lat: number;
  lon: number;
  radius_km?: number;
  fuel_type?: string;
  max_price?: number;
  limit?: number;
}
