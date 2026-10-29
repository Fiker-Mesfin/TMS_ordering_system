import { supabase } from "@/integrations/supabase/client";

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,recipient_id,order_id,event_type,title,body,created_at,read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) throw error;
}
