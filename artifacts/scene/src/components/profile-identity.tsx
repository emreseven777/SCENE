import { BadgeCheck, MapPin } from "lucide-react";
import type { Person } from "@/lib/store";
import { isProvince } from "@/lib/provinces";

export function ProfileIdentity({ person, as: Heading = "h2", size = "text-5xl", cityClassName = "text-xs", testId }: {
  person: Person;
  as?: "h1" | "h2" | "div";
  size?: string;
  cityClassName?: string;
  testId?: string;
}) {
  return (
    <div className="min-w-0 text-white">
      <Heading data-testid={testId} className={`break-words font-display font-bold leading-none tracking-tight ${size}`}>
        {person.name}{person.age !== null && <span className="whitespace-nowrap font-semibold">, {person.age}</span>}
      </Heading>
      {person.verified_photo && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs">
        <BadgeCheck aria-hidden="true" className="text-sky-400" size={15} /> Fotoğrafı onaylandı
      </span>}
      <div className={`mt-2 flex items-center gap-1.5 text-white/95 ${cityClassName}`}>
        <MapPin size={14} aria-hidden="true" className="shrink-0" />
        {isProvince(person.city) ? person.city : "İl belirtilmemiş"}
      </div>
    </div>
  );
}
