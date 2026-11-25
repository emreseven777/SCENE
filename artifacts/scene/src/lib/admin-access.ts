import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { requireSupabase } from "./supabase";

export function useAdminAccess() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["scene-admin-access", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("scene_admin_access");
      if (error) throw error;
      return data === true;
    },
  });
}
