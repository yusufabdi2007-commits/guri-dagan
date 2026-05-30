"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Heart, Loader2, MessageCircle, Phone, Star } from "lucide-react";

const PACKAGES = [
  "1:1 Parenting Coaching",
  "Group Parenting Workshop",
  "Online Course",
  "Discovery Call (Free)",
  "Not sure yet",
];

const SOURCES = ["TikTok", "YouTube", "Instagram", "Facebook", "Friend / Family", "Other"];

export default function BookPage() {
  const [form, setForm] = useState({
    client_name: "",
    email: "",
    phone: "",
    package_name: "",
    message: "",
    source: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Request received!</h1>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Thank you for reaching out. We will be in touch with you soon, in sha Allah.
          </p>
          <p className="text-sm text-muted-foreground">
            Mahadsanid — Guri Dagan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border">
        <div className="max-w-lg mx-auto px-6 py-10 text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Book a Session</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ready to take the next step for your family? Fill in your details and we will reach out to help you get started.
          </p>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span>Trusted by Somali families</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span>Culturally sensitive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Fadumo Hassan"
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+44 7700 000000"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>I am interested in</Label>
            <Select value={form.package_name} onValueChange={v => setForm(f => ({ ...f, package_name: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package..." />
              </SelectTrigger>
              <SelectContent>
                {PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>How did you find us?</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Tell us a little about your situation</Label>
            <Textarea
              id="message"
              placeholder="What are you hoping to work on? Any challenges you would like support with? (optional)"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Send Booking Request"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your information is kept private and will only be used to contact you about coaching services.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or reach us directly</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/447700000000?text=Salaam%2C%20I%20am%20interested%20in%20coaching%20with%20Guri%20Dagan."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#20c05a] transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Message on WhatsApp
          </a>

          {/* Packages preview */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
              What we offer
            </p>
            {[
              { name: "Discovery Call", detail: "Free 30-min call to find the right fit", icon: "💬" },
              { name: "1:1 Coaching", detail: "Personalised sessions for your family", icon: "👨‍👩‍👧" },
              { name: "Group Workshop", detail: "Learn with other Somali parents", icon: "👥" },
            ].map(pkg => (
              <div key={pkg.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <span className="text-xl">{pkg.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">{pkg.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
