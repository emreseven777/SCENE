import { MapPin } from "lucide-react";
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
        {person.verified_photo && <svg viewBox="0 0 24 24" aria-label="Doğrulanmış Kişi" role="img" className="ml-2 inline-block size-[0.65em] align-baseline drop-shadow-sm"><path d="M12 1L16 4 20 4 20 8 23 12 20 16 20 20 16 20 12 23 8 20 4 20 4 16 1 12 4 8 4 4 8 4Z" fill="#2196F3"/><path d="m7 12 3 3 7-7" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </Heading>
      {person.verified_photo && <span className="mt-2 block text-sm font-medium text-white drop-shadow-sm"
        title="Yönetici fotoğrafı inceledi. Kimlik doğrulaması yapılmadı.">
        Doğrulanmış Kişi
      </span>}
      <div className={`mt-2 flex items-center gap-1.5 text-white/95 ${cityClassName}`}>
        <MapPin size={14} aria-hidden="true" className="shrink-0" />
        {isProvince(person.city) ? person.city : "İl belirtilmemiş"}
      </div>
    </div>
  );
}
