import { useQuery } from "@tanstack/react-query";
import type { ProfileDetailsData } from "./profile-choices";
import { requireSupabase } from "./supabase";

export const defaultPreferences = {
  show_seen: true, show_presence: true, blur_photos: true,
  details: {} as ProfileDetailsData, public_details: false, instagram: null as string | null, show_instagram: false,
};

export const detailLabels: Record<string, string> = {
  height: "Boy (cm)", occupation: "Meslek", education: "Eğitim", sign: "Burç",
  relationship: "İlişki beklentisi", children: "Çocuk", sport: "Spor", genres: "Favori türler",
  smoking: "Sigara", alcohol: "Alkol", interests: "İlgi alanları", movie: "Favori film",
  series: "Favori dizi", actor: "Favori oyuncu", director: "Favori yönetmen",
  personality: "Kişiliğin", friends: "Arkadaşlıkta aradıkların", lifestyle: "Yaşam tarzın",
  memorable: "Seni en çok etkileyen sahne hangisi?", cinema_night: "İdeal sinema gecen nasıl olur?",
};

export function useScenePreferences(user: string | undefined) {
  return useQuery({
    queryKey: ["scene-preferences", user],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_preferences").select("*").eq("user_id", user!).maybeSingle();
      if (error) throw error;
      return { ...defaultPreferences, ...data } as typeof defaultPreferences;
    },
  });
}

export function useVisibleProfileDetails(viewer: string | undefined, person: string) {
  return useQuery({
    queryKey: ["visible-profile-details", viewer, person], enabled: !!viewer,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("visible_profile_details", { person });
      if (error) throw error;
      return (data?.[0] ?? null) as { details: ProfileDetailsData; instagram: string | null } | null;
    },
  });
}
