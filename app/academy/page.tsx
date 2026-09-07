"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Blocks,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { COUNTRIES } from "@/lib/countries";

interface Track {
  id: string;
  name: string;
  age_range: string;
  total_weeks: number;
  price_amount: number;
  price_currency: string;
}

const trackIcons = ["👶", "🧸", "🧩", "🎒", "🌟"];

export default function AcademyPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Track | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", country: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/academy/tracks")
      .then((res) => res.json())
      .then((data) => setTracks(data.tracks || []))
      .finally(() => setLoading(false));
  }, []);

  async function handleEnroll(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !form.name.trim() || !form.phone.trim() || !form.country.trim()) {
      setError("Please enter your name, WhatsApp number, and the country you're currently in.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/academy/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, country: form.country, track_id: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong. Please try again.");
      else setSubmitted(true);
    } catch {
      setError("We could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf9ff] text-[#201337]">
      <header className="border-b border-[#e7e0f2] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/academy" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5c2ca6] text-white shadow-lg shadow-purple-200">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-tight">Guri Dagan</span>
              <span className="block text-[11px] font-bold tracking-[0.16em] text-[#7957ab]">ACADEMY</span>
            </span>
          </Link>
          <Link href="/academy/login" className="rounded-lg px-3 py-2 text-sm font-bold text-[#51258f] transition hover:bg-[#f4effb]">
            Student login
          </Link>
        </div>
      </header>

      {submitted ? (
        <Success selected={selected} />
      ) : selected ? (
        <EnrollmentForm selected={selected} tracks={tracks} form={form} error={error} submitting={submitting} onBack={() => setSelected(null)} onChange={setForm} onSubmit={handleEnroll} />
      ) : (
        <main>
          <section className="relative overflow-hidden bg-[#2d1453] px-5 pb-14 pt-12 text-white sm:px-8 sm:pb-20 sm:pt-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#a987e8]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#f2d675]/20 blur-3xl" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_.8fr]">
              <div className="max-w-2xl">
                <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-purple-100">STRUCTURED PARENTING SUPPORT</p>
                <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">Parenting support that meets your child where they are.</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-purple-100/85 sm:text-lg">Choose an age group and join a focused course with weekly lessons, practical support, and a community of parents moving forward together.</p>
              </div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <p className="text-sm font-bold text-purple-100">A simple path into the Academy</p>
                <ol className="mt-5 space-y-4">
                  <HeroStep number="1" text="Choose your child’s age group" />
                  <HeroStep number="2" text="Register with your WhatsApp number" />
                  <HeroStep number="3" text="Start learning, one week at a time" />
                </ol>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-[#7957ab]">CHOOSE A COURSE</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">What age is your child?</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#6d627c]">Each pathway is made for the developmental stage your family is living through now.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-[#5c2ca6]" /></div>
            ) : tracks.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track, index) => <TrackCard key={track.id} track={track} index={index} onClick={() => setSelected(track)} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#d9cdec] bg-white p-12 text-center">
                <GraduationCap className="mx-auto h-9 w-9 text-[#7957ab]" />
                <h2 className="mt-4 text-xl font-extrabold">Courses are being prepared</h2>
                <p className="mt-2 text-sm text-[#6d627c]">Please check back soon.</p>
              </div>
            )}
          </section>

          <section className="border-y border-[#e7e0f2] bg-white">
            <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8">
              <Benefit icon={<BookOpen />} title="Weekly guidance" text="A clear focus each week, made easy to return to at home." />
              <Benefit icon={<HeartHandshake />} title="Real support" text="Learn alongside parents navigating the same season." />
              <Benefit icon={<LockKeyhole />} title="Your own pace" text="Open your course securely whenever you are ready." />
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

function TrackCard({ track, index, onClick }: { track: Track; index: number; onClick: () => void }) {
  const icon = trackIcons[index % trackIcons.length];
  return <button onClick={onClick} className="group min-h-[260px] rounded-[1.5rem] border border-[#e7e0f2] bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#bba3dd] hover:shadow-xl hover:shadow-purple-100">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2ecfb] text-2xl">{icon}</span>
    <p className="mt-7 text-xl font-extrabold tracking-tight">{track.name}</p>
    <p className="mt-1 text-sm font-semibold text-[#7957ab]">{track.age_range}</p>
    <p className="mt-3 text-lg font-extrabold text-[#201337]">${track.price_amount}<span className="text-sm font-semibold text-[#6d627c]">/month</span></p>
    <div className="mt-6 flex items-center justify-between border-t border-[#eee8f5] pt-4 text-sm"><span className="font-medium text-[#6d627c]">{track.total_weeks} week course</span><span className="inline-flex items-center gap-1.5 font-bold text-[#51258f]">Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
  </button>;
}

function EnrollmentForm({ selected, tracks, form, error, submitting, onBack, onChange, onSubmit }: { selected: Track; tracks: Track[]; form: { name: string; phone: string; country: string }; error: string; submitting: boolean; onBack: () => void; onChange: (form: { name: string; phone: string; country: string }) => void; onSubmit: (event: React.FormEvent) => void }) {
  const icon = trackIcons[Math.max(0, tracks.findIndex((track) => track.id === selected.id)) % trackIcons.length];
  return <main className="mx-auto max-w-xl px-5 py-10 sm:px-8 sm:py-16"><button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#51258f]"><ArrowLeft className="h-4 w-4" /> All age groups</button><section className="overflow-hidden rounded-[2rem] border border-[#e7e0f2] bg-white shadow-xl shadow-purple-100/50"><div className="bg-[#2d1453] p-7 text-white"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">{icon}</span><p className="mt-6 text-xs font-bold tracking-[0.14em] text-purple-200">YOUR COURSE</p><h1 className="mt-2 text-3xl font-extrabold">{selected.name}</h1><p className="mt-2 text-sm text-purple-100">{selected.age_range} · {selected.total_weeks} weeks</p><p className="mt-3 text-lg font-extrabold text-white">${selected.price_amount}<span className="text-sm font-semibold text-purple-200"> / month</span></p></div><form onSubmit={onSubmit} className="space-y-5 p-6 sm:p-8"><div className="space-y-2"><Label htmlFor="name">Your name</Label><Input id="name" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="e.g. Fadumo Hassan" className="h-12 border-[#ddd3ea] bg-[#fcfbfe]" /></div><div className="space-y-2"><Label htmlFor="phone">WhatsApp number</Label><PhoneInput id="phone" value={form.phone} onChange={(phone) => onChange({ ...form, phone })} required className="h-12 border-[#ddd3ea] bg-[#fcfbfe]" /></div><div className="space-y-2"><Label htmlFor="country">Country you&apos;re currently in</Label><select id="country" value={form.country} onChange={(event) => onChange({ ...form, country: event.target.value })} required className="h-12 w-full rounded-xl border border-[#ddd3ea] bg-[#fcfbfe] px-4 text-sm"><option value="">Select your country</option>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}<Button type="submit" disabled={submitting} className="h-12 w-full bg-[#5c2ca6] text-base font-bold hover:bg-[#482083]">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Register for this course <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="text-center text-xs leading-5 text-[#6d627c]">We will contact you with the next step after registration.</p></form></section></main>;
}

function Success({ selected }: { selected: Track | null }) { return <main className="mx-auto flex min-h-[calc(100vh-76px)] max-w-lg items-center px-5 py-12"><section className="w-full rounded-[2rem] border border-[#e7e0f2] bg-white p-8 text-center shadow-xl shadow-purple-100/50"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600"><CheckCircle2 className="h-8 w-8" /></span><p className="mt-6 text-xs font-bold tracking-[0.14em] text-[#7957ab]">REGISTRATION RECEIVED</p><h1 className="mt-2 text-3xl font-extrabold">You&apos;re on the list.</h1><p className="mt-4 leading-7 text-[#6d627c]">We&apos;ll contact you on WhatsApp about <strong className="text-[#201337]">{selected?.name}</strong> and the next step.</p><Link href="/academy" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#51258f]"><ArrowLeft className="h-4 w-4" /> Back to Academy</Link></section></main>; }
function HeroStep({ number, text }: { number: string; text: string }) { return <li className="flex items-center gap-3 text-sm font-semibold text-white"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">{number}</span>{text}</li>; }
function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2ecfb] text-[#5c2ca6]">{icon}</span><div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#6d627c]">{text}</p></div></div>; }
