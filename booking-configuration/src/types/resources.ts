export type ResourceFormData = {
  id?: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  available: boolean;
  image: string;
};

export type Resource = ResourceFormData & {
  id: number;
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
