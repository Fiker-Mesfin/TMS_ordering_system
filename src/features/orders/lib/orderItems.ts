import type { Json } from "@/integrations/supabase/types";

export function getOrderItemExtraNames(extras: Json | undefined): string[] {
  if (!Array.isArray(extras)) return [];

  return extras.flatMap((extra) => {
    if (typeof extra !== "object" || extra === null || Array.isArray(extra)) return [];
    return typeof extra["name"] === "string" ? [extra["name"]] : [];
  });
}
