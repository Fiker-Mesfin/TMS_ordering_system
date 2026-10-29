export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_key: string | null;
  available: boolean;
};

export type MenuExtra = { id: string; name: string; price: number };
