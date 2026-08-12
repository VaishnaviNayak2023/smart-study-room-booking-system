export type ResourceFormData = {
  id?: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  /** Admin in-service / maintenance toggle (DB flag). */
  available: boolean;
  image: string;
};

export type Resource = ResourceFormData & {
  id: number;
  /** Effective bookable state: in service and not occupied by an active booking. */
  inService?: boolean;
  isBooked?: boolean;
  availabilityStatus?: 'available' | 'booked' | 'maintenance';
  activeBookingId?: string | null;
  activeBookingStatus?: string | null;
};

export type ResourceTypeFormData = {
  id?: number;
  name: string;
  description: string;
  icon: string;
  color: string;
};

export type ResourceType = ResourceTypeFormData & {
  id: number;
  resources: number;
};
