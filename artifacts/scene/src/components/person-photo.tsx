import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AVATAR_BUCKET } from "@/lib/avatars";
import { requireSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const initials = (n: string) =>
  n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr") || "S";

// Hue derived from the user id so each person keeps a stable color.
function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function PersonPhoto({ id, name, avatarPath, className, textClassName }: { id: string; name: string; avatarPath: string | null; className?: string; textClassName?: string }) {
  const { userId } = useAuth();
  const [brokenUrl, setBrokenUrl] = useState("");
  const { data: url } = useQuery({
    queryKey: ["profile-avatar", userId, avatarPath],
    enabled: !!userId && !!avatarPath,
    queryFn: async () => {
      const { data, error } = await requireSupabase().storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath!, 300);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 240_000,
    gcTime: 240_000,
    refetchInterval: 240_000,
    retry: false,
  });
  const tint = hueFor(id) % 40;
  return (
    <div
      role="img"
      aria-label={name}
      className={cn("relative grid place-items-center overflow-hidden font-display font-black uppercase", className)}
      style={{ background: `radial-gradient(120% 90% at 30% 15%, hsl(${357 - tint / 4} 80% ${38 + tint / 4}%) 0%, hsl(357 60% 14%) 55%, hsl(0 8% 5%) 100%)` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_3px,hsl(0_0%_0%/0.18)_3px_4px)]" />
      <span className={cn("relative text-white/90", textClassName)}>{initials(name)}</span>
      {url && url !== brokenUrl && (
        <img alt="" src={url} loading="lazy" onError={() => setBrokenUrl(url)} className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}
