export interface Guest {
  id: string;
  name: string;
  tableId?: string;
  dietaryRestrictions?: string;
  notes?: string;
  seatPosition?: number; // Stable seat position around the table (0-based)
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  shape: 'round' | 'rectangular';
  guestIds: string[];
}

export interface AppState {
  guests: Guest[];
  tables: Table[];
  selectedTable?: string;
  selectedGuest?: string;
}