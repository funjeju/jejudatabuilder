// FIX: Removed self-import of types to resolve declaration conflicts.
// A virtual representation of Firestore's Geopoint
export interface Geopoint {
  latitude: number;
  longitude: number;
}

// A virtual representation of Firestore's Timestamp
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface ImageInfo {
  url: string;
  caption: string;
  file?: File; // For local preview before upload
}

export interface Attributes {
  targetAudience: string[];
  recommendedSeasons: string[];
  withKids: string;
  withPets: string;
  parkingDifficulty: string;
  admissionFee: string;
  recommended_time_of_day?: string[];
}

export interface CategorySpecificInfo {
  signatureMenu?: string;
  priceRange?: string;
  difficulty?: string;
}

export interface Comment {
  type: string;
  content: string;
}

export interface LinkedSpot {
  link_type: string;
  place_id: string;
  place_name: string;
}

export interface PublicInfo {
    operating_hours?: string;
    phone_number?: string;
    website_url?: string;
    closed_days?: string[];
}

export interface Suggestion {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface EditLog {
    fieldPath: string;
    previousValue: any;
    newValue: any;
    acceptedBy: string;
    acceptedAt: Timestamp;
    suggestionId: string;
}


export interface Place {
  place_id: string;
  place_name: string;
  creator_id?: string;
  status: 'draft' | 'published' | 'rejected' | 'stub';
  categories?: string[];
  address?: string | null;
  region?: string | null;
  location?: Geopoint | null;
  images?: ImageInfo[];
  attributes?: Attributes | null;
  average_duration_minutes?: number | null;
  category_specific_info?: CategorySpecificInfo | null;
  expert_tip_raw?: string;
  expert_tip_final?: string | null;
  comments?: Comment[] | null;
  linked_spots?: LinkedSpot[];
  created_at?: Timestamp;
  updated_at?: Timestamp;
  public_info?: PublicInfo | null;
  tags?: string[] | null;
  import_url?: string;

  // For collaboration and versioning
  suggestions?: Record<string, Suggestion[]>;
  edit_history?: EditLog[];
}

export interface InitialFormData {
    categories: string[];
    spotName: string;
    spotDescription: string;
    importUrl: string;
}

export interface WeatherSource {
  id: string;
  youtubeUrl: string;
  title: string;
  apiKey: string;
}

export interface WeatherCardData {
  status: 'analyzing' | 'capturing' | 'overlaying' | 'done';
  sourceTitle: string;
  imageUrl: string;
  // Dummy weather data for simulation
  weatherData: {
    temp: string;
    humidity: string;
    wind: string;
  };
}
