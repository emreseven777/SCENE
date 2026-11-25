import { useEffect, useId, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchProfileTmdb } from "@/lib/tmdb";
import {
  CHOICES, GENRES, INTERESTS, OCCUPATIONS, TMDB_FIELDS, UNDISCLOSED, UNDISCLOSED_LABEL,
  isTmdbPick, profileLabel, searchKey, type ProfileDetailsData, type ProfileValue, type TmdbField,
} from "@/lib/profile-choices";

const control = "mt-1 block h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
const heights = Array.from({ length: 111 }, (_, i) => [String(i + 130), `${i + 130} cm`] as const);
const labels = {
  education: "Eğitim", smoking: "Sigara", alcohol: "Alkol",
  relationship: "İlişki beklentisi", children: "Çocuk", sport: "Spor",
};

function LegacyNote({ value }: { value: string | undefined }) {
  return value ? <p className="mt-1 break-words text-xs text-muted-foreground">Önceki yanıt: {value}</p> : null;
}

function SelectField({ label, options, value, onChange }: {
  label: string;
  options: readonly (readonly [string, string])[];
  value?: ProfileValue;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const selected = typeof value === "string" && (value === UNDISCLOSED || options.some(([key]) => key === value));
  return <div className="min-w-0">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <select id={id} value={selected ? value : ""} className={control} onChange={(event) => onChange(event.target.value)}>
      <option value="">Seç</option>
      <option value={UNDISCLOSED}>{UNDISCLOSED_LABEL}</option>
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
    <LegacyNote value={!selected ? profileLabel("", value) : undefined} />
  </div>;
}

function OccupationField({ value, onChange }: { value?: ProfileValue; onChange: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = typeof value === "string" && OCCUPATIONS.includes(value);
  const filtered = OCCUPATIONS.filter((item) => searchKey(item).includes(searchKey(query)));
  return <div className="min-w-0">
    <p className="text-sm font-medium">Meslek</p>
    <Button type="button" variant="secondary" className="mt-1 max-w-full whitespace-normal text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
      {selected ? value : value === UNDISCLOSED ? UNDISCLOSED_LABEL : "Meslek seç"}
    </Button>
    <LegacyNote value={!selected ? profileLabel("", value) : undefined} />
    {open && <div className="mt-2 rounded-xl border p-2">
      <Input type="search" aria-label="Meslek ara" placeholder="Meslek ara" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
      <ul className="mt-2 max-h-48 overflow-y-auto">
        {[UNDISCLOSED, ...filtered].map((item) => <li key={item}>
          <button type="button" className="min-h-11 w-full rounded-lg px-2 text-left text-sm hover:bg-muted"
            onClick={() => { onChange(item); setOpen(false); setQuery(""); }}>
            {item === UNDISCLOSED ? UNDISCLOSED_LABEL : item}
          </button>
        </li>)}
      </ul>
      {!filtered.length && <p role="status" className="p-2 text-sm text-muted-foreground">Meslek bulunamadı.</p>}
    </div>}
  </div>;
}

function MultipleField({ label, items, value, onChange }: {
  label: string; items: string[]; value?: ProfileValue; onChange: (value: ProfileValue) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  return <fieldset className="min-w-0">
    <legend className="mb-1 text-sm font-medium">{label}</legend>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={value === UNDISCLOSED ? "default" : "secondary"} aria-pressed={value === UNDISCLOSED} onClick={() => onChange(UNDISCLOSED)}>{UNDISCLOSED_LABEL}</Button>
      {items.map((item) => <Button key={item} type="button" size="sm" aria-pressed={selected.includes(item)}
        disabled={selected.length >= 20 && !selected.includes(item)}
        variant={selected.includes(item) ? "default" : "secondary"}
        onClick={() => onChange(selected.includes(item) ? selected.filter((entry) => entry !== item) : [...selected, item])}>{item}</Button>)}
    </div>
    <LegacyNote value={!Array.isArray(value) ? profileLabel("", value) : undefined} />
  </fieldset>;
}

function TmdbFieldPicker({ field, value, onChange }: { field: TmdbField; value?: ProfileValue; onChange: (answer: ProfileValue) => void }) {
  const label = TMDB_FIELDS[field];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [phrase, setPhrase] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setPhrase(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = useInfiniteQuery({
    queryKey: ["profile-tmdb", field, phrase], initialPageParam: 1,
    enabled: open && phrase.length >= 2 && phrase === input.trim(),
    queryFn: ({ pageParam, signal }) => searchProfileTmdb(field, phrase, pageParam, signal),
    getNextPageParam: (page) => page.nextPage ?? undefined, staleTime: 300_000, retry: false,
  });
  const selected = isTmdbPick(value, field);
  const resultItems = phrase === input.trim()
    ? [...new Map(query.data?.pages.flatMap((page) => page.results.map((item) => [item.id, item]))).values()] : [];
  return <div className="min-w-0">
    <p className="text-sm font-medium">{label}</p>
    <Button type="button" variant="secondary" className="mt-1 max-w-full whitespace-normal text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
      {selected ? profileLabel(field, value) : value === UNDISCLOSED ? UNDISCLOSED_LABEL : `${label} seç`}
    </Button>
    <LegacyNote value={!selected ? profileLabel(field, value) : undefined} />
    {open && <div className="mt-2 space-y-1 rounded-xl border p-2">
      <Input type="search" aria-label={`${label} ara`} placeholder="TMDB’de ara" maxLength={100} value={input} onChange={(event) => setInput(event.target.value)} />
      <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(UNDISCLOSED); setOpen(false); setInput(""); }}>{UNDISCLOSED_LABEL}</Button>
      {query.isFetching && <p role="status" className="px-2 text-xs">Aranıyor…</p>}
      {query.isError && <p role="alert" className="px-2 text-xs">TMDB araması şu anda kullanılamıyor. <button type="button" className="underline" onClick={() => void query.refetch()}>Tekrar dene</button></p>}
      <ul className="max-h-48 overflow-y-auto">
        {resultItems.map((item) => <li key={item.id}><button type="button" className="min-h-11 w-full rounded-lg px-2 text-left text-sm hover:bg-muted"
          onClick={() => { onChange(item); setOpen(false); setInput(""); }}>{profileLabel(field,item)}</button></li>)}
      </ul>
      {!resultItems.length && query.isSuccess && phrase === input.trim() && <p role="status" className="px-2 text-xs">Bu sayfada sonuç yok.</p>}
      {query.hasNextPage && phrase === input.trim() && <Button type="button" size="sm" variant="secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Daha fazla sonuç</Button>}
    </div>}
  </div>;
}

export function ProfileChoiceFields({ details, zodiac, onChange }: {
  details: ProfileDetailsData;
  zodiac?: string;
  onChange: (key: string, value: ProfileValue) => void;
}) {
  return <>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <SelectField label="Boy" options={heights} value={details.height} onChange={(value) => onChange("height", value)} />
      <OccupationField value={details.occupation} onChange={(value) => onChange("occupation", value)} />
      {Object.entries(CHOICES).map(([key, options]) => <SelectField key={key} label={labels[key as keyof typeof labels]} options={Object.entries(options)}
        value={details[key]} onChange={(value) => onChange(key, value)} />)}
      <div>
        <SelectField label="Burç" options={[["automatic", zodiac ? `${zodiac} · otomatik` : "Otomatik hesapla"]]}
          value={details.sign} onChange={(value) => onChange("sign", value)} />
        {zodiac && <p className="mt-1 text-xs text-muted-foreground">Hesaplanan burç: {zodiac}. Paylaşmak için otomatik seçeneğini kaydet.</p>}
      </div>
    </div>
    <MultipleField label="İlgi alanları" items={INTERESTS} value={details.interests} onChange={(value) => onChange("interests", value)} />
    <MultipleField label="Favori türler" items={GENRES} value={details.genres} onChange={(value) => onChange("genres", value)} />
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {(Object.keys(TMDB_FIELDS) as TmdbField[]).map((field) => <TmdbFieldPicker key={field} field={field} value={details[field]}
        onChange={(value) => onChange(field, value)} />)}
    </div>
  </>;
}
