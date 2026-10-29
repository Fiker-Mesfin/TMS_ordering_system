import classic from "@/assets/burger-classic.jpg";
import double from "@/assets/burger-double.jpg";
import berbere from "@/assets/burger-berbere.jpg";
import chicken from "@/assets/burger-chicken.jpg";
import veggie from "@/assets/burger-veggie.jpg";
import { MENU_PHOTO_PREFIX } from "@/lib/menu-photo";

export const MENU_IMAGES: Record<string, string> = { classic, double, berbere, chicken, veggie };
export const menuImage = (key: string | null) =>
  (key && !key.startsWith(MENU_PHOTO_PREFIX) && MENU_IMAGES[key]) || classic;

export const formatETB = (n: number | string) =>
  `ETB ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const PAYMENT_ACCOUNTS = [
  {
    id: "cbe",
    label: "Commercial Bank of Ethiopia (CBE)",
    accountName: "Fiker Mesfin Erkyihun",
    accountNumber: "1000595276628",
  },
  {
    id: "telebirr",
    label: "Telebirr",
    accountName: "Fiker Mesfin Erkyihun",
    accountNumber: "0988241287",
  },
] as const;

export const PHONE_REGEX = /^(\+251|0)?[79][0-9]{8}$/;
