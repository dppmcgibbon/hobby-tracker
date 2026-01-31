export type { Database } from "./database";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Miniature {
  id: string;
  user_id: string;
  name: string;
  faction_id: string;
  created_at: string;
  updated_at: string;
}

// Additional types will be added as we build features