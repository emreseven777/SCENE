import { MapPin } from "lucide-react";
import type { Person } from "@/lib/store";
import { isProvince } from "@/lib/provinces";

export function ProfileIdentity({ person, as: Heading = "h2", size = "text-5xl", testId }: {
  person: Person;
  as?: "h1" | "h2" | "div";
  size?: string;
  testId?: string;
}) {
  return (
    <div className="min-w-0 text-white">
      <Heading data-testid={testId} className={`break-words font-display font-extrabold leading-none tracking-tight ${size}`}>
        {person.name}{person.age !== null && <span className="whitespace-nowrap font-semibold">, {person.age}</span>}
      </Heading>
      <div className="mt-2 flex items-center gap-1 text-xs text-white/90">
        <MapPin size={14} aria-hidden="true" className="shrink-0" />
        {isProvince(person.city) ? person.city : "İl belirtilmemiş"}
      </div>
    </div>
  );
}
