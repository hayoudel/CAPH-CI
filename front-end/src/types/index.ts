export type Domain = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
};

export type ProjectMedia = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  type: 'photo' | 'video';
  title: string;
  src: string;
  subtitles?: boolean;
  duration?: string;
};

export type ProjectDoc = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  type: string;
  description: string;
  date: string;
  downloadable: boolean;
  size?: string;
};

export type Project = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  domain: string;
  region: string;
  zone: string;
  status: 'En cours' | 'Terminé' | 'Planifié';
  year: number;
  target: string;
  duration: string;
  partners: string[];
  description: string;
  objectives: string[];
  activities: string[];
  results: string[];
  image: string;
  beneficiaries: number;
  relatedNewsIds: string[];
  media?: ProjectMedia[];
  docs?: ProjectDoc[];
};

export type NewsItem = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  image: string;
  author: string;
  content: string;
};

export type Delegation = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  name: string;
  region: string;
  city: string;
  responsible: string;
  phone: string;
  email: string;
  members: number;
  projects: number;
  activities: string[];
  x: number;
  y: number;
};

export type Opportunity = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  organization: string;
  category: 'Emploi' | 'Stage' | 'Formation' | 'Bourse' | 'Appel à projets' | 'Financement' | 'Partenariat';
  sector: string;
  region: string;
  deadline: string;
  summary: string;
};

export type OPH = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  name: string;
  region: string;
  type: string;
  domain: string;
  description: string;
  members: number;
  founded: number;
  contact: string;
  image: string;
};

export type Resource = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  category: string;
  type: string;
  date: string;
  author: string;
  description: string;
  pages?: number;
  size?: string;
};

export type MediaItem = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  type: 'photo' | 'video';
  title: string;
  category: string;
  date: string;
  src: string;
  subtitles?: boolean;
  duration?: string;
};

export type AgendaEvent = {
  /** Donnée provisoire : affichée avec le bandeau « Prototype — à valider ». */
  isProvisional?: boolean;
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
  objectives?: string[];
  organizers?: string[];
  contact?: string;
  practicalInfo?: string;
};

export type Stat = { label: string; value: string; icon: string };

export type SiteSettings = {
  name: string;
  tagline: string;
  email: string;
  phones: string[];
  address: string;
  /** Les coordonnées bancaires ne sont jamais exposées par l'API. */
  hasPublicBankDetails: false;
};

export type HomeData = { stats: Stat[] };

export type Testimonial = {
  id: string;
  author: string;
  role: string;
  quote: string;
  isProvisional?: boolean;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };

export type FormKind = 'contact' | 'membership' | 'partnership' | 'quote-request' | 'funding-interest' | 'donation-interest';

export type FormReceipt = {
  /** Toujours vrai : aucune donnée n'est transmise ni stockée par le mock. */
  simulated: true;
  reference: string;
  receivedAt: string;
  message: string;
};

export type AuthSession = { authenticated: boolean; prototype: true; displayName: string };
