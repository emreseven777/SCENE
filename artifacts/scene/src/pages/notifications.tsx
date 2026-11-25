import { PushSettings } from "@/components/push-settings";
import { Link } from "wouter";
import { SceneHeading } from "@/components/scene-brand";
import { useStore } from "@/lib/store";

export default function Notifications() {
  const store = useStore();
  const entries = store.people.flatMap((person) => {
    const unread = (store.messages[person.id] ?? []).filter((m) => m.from === "them" && !m.deleted && Number(m.id) > (store.readThrough[person.id] ?? 0)).length;
    if (unread) return [{ id: person.id, label: `${person.name} · ${unread} okunmamış mesaj`, path: `/mesajlar/${person.id}` }];
    if (store.matches[person.id]) return [{ id: person.id, label: `${person.name} ile eşleştin`, path: "/begeniler" }];
    if (store.incoming[person.id]) return [{ id: person.id, label: `${person.name} ${store.incoming[person.id] === "super" ? "süper beğeni gönderdi" : "seni beğendi"}`, path: "/begeniler" }];
    return [];
  });
  return <div className="scene-page max-w-2xl">
    <SceneHeading title="Bildirimler" />
    {entries.length ? <ul className="scene-panel divide-y">{entries.map((entry) => <li key={entry.id}>
      <Link href={entry.path} className="block p-4 text-sm font-semibold">{entry.label}</Link>
    </li>)}</ul> : <p className="text-sm text-muted-foreground">Henüz bildirim yok.</p>}
    {store.me && <PushSettings user={store.me.id} />}
  </div>;
}
