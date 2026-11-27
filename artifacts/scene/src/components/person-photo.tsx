import { useEffect, useRef, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AVATAR_BUCKET, avatarThumbnail } from "@/lib/avatars";
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

function avatarQuery(userId: string | null, avatarPath: string | null, thumbnailPath: string | null = null) {
  return queryOptions({
    queryKey: ["profile-avatar", userId, avatarPath, thumbnailPath],
    enabled: !!userId && !!avatarPath,
    queryFn: async () => {
      const bucket = requireSupabase().storage.from(AVATAR_BUCKET);
      if (thumbnailPath) {
        const thumbnail = await bucket.createSignedUrl(thumbnailPath, 60);
        if (!thumbnail.error) return thumbnail.data.signedUrl;
        // An unavailable thumbnail must pass the same authorization as the original.
      }
      const { data, error } = await bucket.createSignedUrl(avatarPath!, 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 40_000,
    gcTime: 45_000,
    retry: false,
  });
}

export function usePreloadPortraits(first?: string | null) {
  const { userId } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!userId || !first || connection?.saveData || (connection?.effectiveType && connection.effectiveType !== "4g")) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      void client.fetchQuery(avatarQuery(userId, first)).then((url) => {
        if (!active) return;
        const image = new Image();
        image.fetchPriority = "low";
        image.src = url;
      }).catch(() => { /* The visible portrait can retry independently. */ });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
      // Allow already-started image downloads to finish for the next card.
    };
  }, [client, userId, first]);
}

export function PersonPhoto({ id, name, avatarPath, className, textClassName, contain = false, priority = false }: { id: string; name: string; avatarPath: string | null; className?: string; textClassName?: string; contain?: boolean; priority?: boolean }) {
  const { userId } = useAuth();
  const element = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState<boolean | null>(null);
  const thumbnail = avatarPath && !priority && !contain ? avatarThumbnail(avatarPath) : null;
  useEffect(() => {
    const node = element.current;
    if (!node || !thumbnail) return;
    const measure = () => {
      const side = Math.max(node.clientWidth, node.clientHeight);
      setSmall(side > 0 && side <= 104 && side * window.devicePixelRatio <= 320);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [thumbnail]);

  const [brokenUrl, setBrokenUrl] = useState("");
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const selectedThumbnail = small && thumbnail !== failedThumbnail ? thumbnail : null;
  const { data: url, refetch } = useQuery(avatarQuery(userId, thumbnail && small === null ? null : avatarPath, selectedThumbnail));
  useEffect(() => { setBrokenUrl(""); setFailedThumbnail(null); }, [avatarPath, userId]);
  const visible = !!url && url !== brokenUrl;
  const tint = hueFor(id) % 60;
  return (
    <div
      ref={element}
      role="img"
      aria-label={name}
      className={cn("relative grid place-items-center overflow-hidden font-display font-bold uppercase", className)}
      style={!contain || !visible ? { background: `linear-gradient(145deg, #ff914d 0%, hsl(${330 + tint / 2} 85% 62%) 52%, #6d42bb 100%)` } : undefined}
    >

      {!visible && <span className={cn("relative text-white drop-shadow-md", textClassName)}>{initials(name)}</span>}
      {visible && url && (
        <img alt="" src={url} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"}
          onError={() => {
            setBrokenUrl(url);
            if (selectedThumbnail) setFailedThumbnail(selectedThumbnail);
            else if (!brokenUrl) void refetch();
          }} className={cn("absolute inset-0 h-full w-full", contain ? "object-contain object-top" : "object-cover")} />
      )}
    </div>
  );
}
