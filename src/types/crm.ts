export interface ContactNode {
  id: string;
  name: string;
  contactType: string;
  directors: string[];
  position: string;
  email: string;
  phone: string;
  linkedIn: string;
  lastContacted: string;
  notes: string;
  connectedToIds: string[];
  tag?: "Landlord" | "Occupier" | "Both" | null;
}

export interface AccountNode {
  id: string;
  name: string;
  domain: string;
  logoUrl: string;
  cluster: "consultants" | "clients" | "unknown";
  accountType: string;
  contacts: ContactNode[];
  contactCount: number;
  directors: string[];
  tag?: "Landlord" | "Occupier" | "Both" | null;
}

export interface AccountEdge {
  source: string;
  target: string;
  strength: number;
}
