import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
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

function avatarQuery(userId: string | null, avatarPath: string | null) {
  return queryOptions({
    queryKey: ["profile-avatar", userId, avatarPath],
    enabled: !!userId && !!avatarPath,
    queryFn: async () => {
      const { data, error } = await requireSupabase().storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath!, 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 40_000,
    gcTime: 45_000,
    retry: false,
  });
}

export function usePreloadPortraits(first?: string | null, second?: string | null, third?: string | null) {
  const { userId } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!userId || connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      for (const path of new Set([first, second, third])) {
        if (!path) continue;
        void client.fetchQuery(avatarQuery(userId, path)).then((url) => {
          if (!active) return;
          const image = new Image();
          image.fetchPriority = "low";
          image.src = url;
        }).catch(() => { /* The visible portrait can retry independently. */ });
      }
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
      // Allow already-started image downloads to finish for the next card.
    };
  }, [client, userId, first, second, third]);
}

export function PersonPhoto({ id, name, avatarPath, className, textClassName, contain = false, priority = false }: { id: string; name: string; avatarPath: string | null; className?: string; textClassName?: string; contain?: boolean; priority?: boolean }) {
  const { userId } = useAuth();
  const [brokenUrl, setBrokenUrl] = useState("");
  const { data: url, refetch } = useQuery(avatarQuery(userId, avatarPath));
  useEffect(() => setBrokenUrl(""), [avatarPath, userId]);
  const visible = !!url && url !== brokenUrl;
  const tint = hueFor(id) % 60;
  return (
    <div
      role="img"
      aria-label={name}
      className={cn("relative grid place-items-center overflow-hidden font-display font-bold uppercase", className)}
      style={!contain || !visible ? { background: `linear-gradient(145deg, #ff914d 0%, hsl(${330 + tint / 2} 85% 62%) 52%, #6d42bb 100%)` } : undefined}
    >

      {!visible && <span className={cn("relative text-white drop-shadow-md", textClassName)}>{initials(name)}</span>}
      {visible && url && (
        <img alt="" src={url} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"}
          onError={() => { setBrokenUrl(url); if (brokenUrl !== url && !brokenUrl) void refetch(); }} className={cn("absolute inset-0 h-full w-full", contain ? "object-contain object-top" : "object-cover")} />
      )}
    </div>
  );
}
