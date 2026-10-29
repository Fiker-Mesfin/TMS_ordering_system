import { useQuery } from "@tanstack/react-query";
import { useEffect, type ComponentProps } from "react";
import { supabase } from "@/integrations/supabase/client";
import { menuImage } from "@/lib/shop";
import { MENU_PHOTO_PREFIX } from "@/lib/menu-photo";

export function MenuPhoto({
  imageKey,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { imageKey: string | null }) {
  const path = imageKey?.startsWith(MENU_PHOTO_PREFIX)
    ? imageKey.slice(MENU_PHOTO_PREFIX.length)
    : null;
  const { data, error } = useQuery({
    queryKey: ["menu-photo", path],
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
    queryFn: async () => {
      if (!path) throw new Error("Menu photo path is missing");
      const { data, error } = await supabase.storage
        .from("menu-photos")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  useEffect(() => {
    if (error) console.error("Could not load menu photo", error);
  }, [error]);

  return <img {...props} src={path ? data : menuImage(imageKey)} />;
}
