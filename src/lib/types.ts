export type Shop = {
  id: string;
  owner_name: string;
  business_name: string;
  tin: string | null;
  vat_rate: number;
};

export type Profile = {
  id: string;
  shop_id: string;
  full_name: string;
  role: "admin" | "seller";
};

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  unit_price_before_vat: number;
  unit_of_measure: number;
  is_active: boolean;
};

export type Sale = {
  id: string;
  shop_id: string;
  seller_id: string;
  vat_category: "G" | "S";
  type_of_sale: 1 | 2 | 3;
  buyer_tin: string | null;
  buyer_name: string | null;
  sale_date: string; // ISO Gregorian date
  mrc_number: string | null;
  vat_receipt_number: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  description: string;
  unit_of_measure: number;
  quantity: number;
  unit_price: number;
  total_value: number;
  vat: number;
  value_after_vat: number;
};

export type NewSaleItemInput = {
  product_id: string | null;
  description: string;
  unit_of_measure: number;
  quantity: number;
  unit_price: number;
};

export type NewSaleInput = {
  vat_category: "G" | "S";
  type_of_sale: 1 | 2 | 3;
  buyer_tin: string | null;
  buyer_name: string | null;
  sale_date: string;
  mrc_number: string | null;
  vat_receipt_number: string;
  items: NewSaleItemInput[];
};
