import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CATALOG } from "@/lib/catalog";
import { useStore } from "@/lib/store";

const quiz = [
  { question: "Baba filminin yönetmeni kimdir?", choices: ["Francis Ford Coppola", "Martin Scorsese", "Quentin Tarantino"], answer: 0 },
  { question: "Walter White hangi dizinin karakteridir?", choices: ["Dark", "Breaking Bad", "Succession"], answer: 1 },
  { question: "The Bear dizisi ağırlıklı olarak hangi ortamda geçer?", choices: ["Bir müzede", "Bir laboratuvarda", "Bir restoran mutfağında"], answer: 2 },
  { question: "Ruhların Kaçışı filminin başkarakteri kimdir?", choices: ["Chihiro", "Amelie", "Mia"], answer: 0 },
];
const personality = [
  { question: "Bir film gecesinde seni en çok ne çeker?", choices: ["Tuhaf bir evren", "İnsan ilişkileri", "İnce bir mizah"] },
  { question: "Finalde ne bekliyorsun?", choices: ["Şaşırtıcı bir fikir", "Duygusal bir kapanış", "Gülümseten bir an"] },
  { question: "Bir yapımı başkalarına neden önerirsin?", choices: ["Hayal gücü için", "Karakterleri için", "Eğlencesi için"] },
];
const results = ["Bilim kurgu ve fantastik", "Dram ve romantik", "Komedi"];

export default function CinemaActivities() {
  const store = useStore();
  const [mode, setMode] = useState<"quiz" | "personality">("quiz");
  const [answers, setAnswers] = useState<number[]>([]);
  const questions = mode === "quiz" ? quiz : personality;
  const current = questions[answers.length];
  const score = answers.filter((answer, index) => answer === quiz[index]?.answer).length;
  const counts = results.map((_, index) => answers.filter((value) => value === index).length);
  const preferredGenres = new Set(store.me?.favorites.flatMap((id) => store.titleById(id)?.genres ?? []));
  const candidates = CATALOG.filter((item) => item.type === "film" && !store.isFav(item.id));
  const relevant = candidates.filter((item) => item.genres.some((genre) => preferredGenres.has(genre)));
  const picks = relevant.length >= 3 ? relevant : candidates;
  // Monday-based rotation, using the product's Turkish calendar.
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "numeric", day: "numeric" }).formatToParts();
  const part = (type: string) => Number(dateParts.find((entry) => entry.type === type)?.value);
  const week = Math.floor((Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000 + 3) / 7);
  const recommendations = Array.from({ length: Math.min(3, picks.length) }, (_, index) => picks[(week * 3 + index) % picks.length]);

  return <section className="scene-page max-w-3xl space-y-4">
    <Link href="/sinema" className="text-sm text-brand-ink underline">Sinema Salonu</Link>
    <h1 className="scene-title">Sinema etkinlikleri</h1>
    <div className="flex flex-wrap gap-2">
      <Button variant={mode === "quiz" ? "default" : "secondary"} onClick={() => { setMode("quiz"); setAnswers([]); }}>Bilgi yarışması</Button>
      <Button variant={mode === "personality" ? "default" : "secondary"} onClick={() => { setMode("personality"); setAnswers([]); }}>Sinema kişilik testi</Button>
    </div>
    <section className="scene-panel space-y-3 p-4">
      {current ? <>
        <p className="text-sm text-muted-foreground">Soru {answers.length + 1} / {questions.length}</p>
        <h2 className="text-xl font-semibold">{current.question}</h2>
        <div className="grid gap-2">{current.choices.map((choice, index) => <Button key={choice} variant="secondary"
          onClick={() => setAnswers((previous) => [...previous, index])}>{choice}</Button>)}</div>
      </> : <>
        <h2 className="text-xl font-semibold" role="status">{mode === "quiz" ? `${score} / ${quiz.length} doğru`
          : results.filter((_, index) => counts[index] === Math.max(...counts)).join(" · ")}</h2>
        {mode === "quiz" && <ul className="space-y-2 text-sm">{quiz.map((item) => <li key={item.question}>{item.question} <strong>{item.choices[item.answer]}</strong></li>)}</ul>}
        <Button variant="secondary" onClick={() => setAnswers([])}>Yeniden başla</Button>
      </>}
    </section>
    <section className="scene-panel space-y-3 p-4">
      <h2 className="text-xl font-semibold">Haftanın film önerileri</h2>
      {!recommendations.length && <p>Arşivde önerebileceğimiz başka film kalmadı.</p>}
      {recommendations.map((item) => <Link className="block text-brand-ink underline" key={item.id}
        href={`/arama?q=${encodeURIComponent(item.title)}`}>{item.title} ({item.year})</Link>)}
    </section>
  </section>;
}
