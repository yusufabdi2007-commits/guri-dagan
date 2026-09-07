"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GraduationCap, Loader2, LockKeyhole, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcademyLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/academy/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) setError(data.error || "We could not log you in."); else router.push("/academy/course");
    } catch { setError("We could not connect. Please try again."); } finally { setSubmitting(false); }
  }

  return <div className="min-h-screen bg-[#140a27] text-white"><header className="border-b border-white/10"><div className="mx-auto flex max-w-5xl items-center px-5 py-5 sm:px-8"><Link href="/academy" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-100/70 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Academy</Link></div></header><main className="mx-auto grid min-h-[calc(100vh-77px)] max-w-5xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_430px]"><section className="max-w-lg"><div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400 text-slate-950"><GraduationCap className="h-7 w-7" /></div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-200">Welcome back</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Your course is waiting for you.</h1><p className="mt-5 text-base leading-7 text-violet-100/70">Pick up this week&apos;s lesson, join your live session, and keep moving forward with your family.</p><div className="mt-8 space-y-4 border-l border-violet-300/30 pl-5 text-sm text-violet-100/65"><p className="flex items-center gap-3"><LockKeyhole className="h-4 w-4 text-violet-300" /> Your details are private and secure.</p><p className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-violet-300" /> Your login was sent after payment was confirmed.</p></div></section><section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 sm:p-8"><h2 className="text-2xl font-bold text-white">Student login</h2><p className="mt-2 text-sm leading-6 text-violet-100/65">Use the username and password sent to you on WhatsApp.</p><form onSubmit={handleSubmit} className="mt-7 space-y-5"><div className="space-y-2"><Label htmlFor="username" className="text-violet-100">Username</Label><Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. yusuf482" className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-violet-200/40" /></div><div className="space-y-2"><Label htmlFor="password" className="text-violet-100">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your access code" className="h-12 border-white/10 bg-white/[0.06] text-white placeholder:text-violet-200/40" /></div>{error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p>}<Button type="submit" className="h-12 w-full bg-violet-400 text-base font-bold text-slate-950 hover:bg-violet-300" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Open my course <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></form><p className="mt-6 text-center text-xs leading-5 text-violet-100/55">Not enrolled yet? <Link href="/academy" className="font-semibold text-violet-200 hover:text-white">Choose an age group</Link></p></section></main></div>;
}
