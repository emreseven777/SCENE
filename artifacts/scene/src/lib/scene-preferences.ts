import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "./supabase";

export const defaultPreferences = {
  show_seen: true, show_presence: true, blur_photos: true,
  details: {} as Record<string, string>, public_details: false, instagram: null as string | null, show_instagram: false,
};

export const detailLabels: Record<string, string> = {
  height: "Boy (cm)", occupation: "Meslek", education: "Eğitim", sign: "Burç",
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
