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
  bookedByCurrentUser?: boolean;
  bookedByOthers?: boolean;
  canBook?: boolean;
  availabilityStatus?: 'available' | 'booked' | 'maintenance' | 'unavailable';
  unavailableIntervals?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    bookingId?: string | null;
    isMine?: boolean;
  }>;
  activeBookingId?: string | null;
  activeBookingStatus?: string | null;
  hourlyRate?: number;
  currency?: string;
  freeFirstHour?: boolean;
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
