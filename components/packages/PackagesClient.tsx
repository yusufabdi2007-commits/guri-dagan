"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Package, Plus, Pencil, Trash2, Users, Calendar,
  DollarSign, BookOpen, Star, Mail, Phone, MessageSquare
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CoachingPackage {
  id: string;
  name: string;
  description: string | null;
  price_usd: number | null;
  currency: string;
  sessions_included: number | null;
  duration_weeks: number | null;
  type: string;
  active: boolean;
  sort_order: number;
}

interface BookingRequest {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  package_name: string | null;
  message: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

interface Props {
  packages: CoachingPackage[];
  bookings: BookingRequest[];
  userId: string;
}

const PACKAGE_TYPES = ["individual", "group", "workshop", "course"];
const BOOKING_STATUSES = ["New", "Contacted", "Booked", "Declined"];
const SOURCES = ["TikTok", "YouTube", "Instagram", "Facebook", "Direct", "Referral", "Website"];

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Booked: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Declined: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

const emptyPackage = {
  name: "",
  description: "",
  price_usd: "",
  sessions_included: "",
  duration_weeks: "",
  type: "individual",
  active: true,
};

const emptyBooking = {
  client_name: "",
  email: "",
  phone: "",
  package_id: "",
  package_name: "",
  message: "",
  status: "New",
  source: "Direct",
};

export function PackagesClient({ packages: initialPackages, bookings: initialBookings, userId }: Props) {
  const [packages, setPackages] = useState(initialPackages);
  const [bookings, setBookings] = useState(initialBookings);
  const [activeTab, setActiveTab] = useState<"packages" | "bookings">("packages");
  const [pkgDialog, setPkgDialog] = useState(false);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<CoachingPackage | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPackage);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [saving, setSaving] = useState(false);

  function openAddPackage() {
    setEditingPkg(null);
    setPkgForm(emptyPackage);
    setPkgDialog(true);
  }

  function openEditPackage(pkg: CoachingPackage) {
    setEditingPkg(pkg);
    setPkgForm({
      name: pkg.name,
      description: pkg.description || "",
      price_usd: pkg.price_usd?.toString() || "",
      sessions_included: pkg.sessions_included?.toString() || "",
      duration_weeks: pkg.duration_weeks?.toString() || "",
      type: pkg.type,
      active: pkg.active,
    });
    setPkgDialog(true);
  }

  async function savePackage() {
    if (!pkgForm.name.trim()) {
      toast({ title: "Package name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: pkgForm.name.trim(),
      description: pkgForm.description || null,
      price_usd: pkgForm.price_usd ? parseFloat(pkgForm.price_usd) : null,
      sessions_included: pkgForm.sessions_included ? parseInt(pkgForm.sessions_included) : null,
      duration_weeks: pkgForm.duration_weeks ? parseInt(pkgForm.duration_weeks) : null,
      type: pkgForm.type,
      active: pkgForm.active,
    };

    if (editingPkg) {
      const { data, error } = await supabase.from("coaching_packages").update(payload).eq("id", editingPkg.id).select().single();
      if (!error && data) {
        setPackages(p => p.map(pkg => pkg.id === data.id ? data : pkg));
        toast({ title: "Package updated!" });
      }
    } else {
      const { data, error } = await supabase.from("coaching_packages").insert({ ...payload, user_id: userId }).select().single();
      if (!error && data) {
        setPackages(p => [data, ...p]);
        toast({ title: "Package created!" });
      }
    }
    setSaving(false);
    setPkgDialog(false);
  }

  async function deletePackage(id: string) {
    const supabase = createClient();
    await supabase.from("coaching_packages").delete().eq("id", id);
    setPackages(p => p.filter(pkg => pkg.id !== id));
    toast({ title: "Package deleted" });
  }

  async function saveBooking() {
    if (!bookingForm.client_name.trim()) {
      toast({ title: "Client name is required", variant: "destructive" as never });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const selectedPkg = packages.find(p => p.id === bookingForm.package_id);
    const { data, error } = await supabase.from("booking_requests").insert({
      user_id: userId,
      client_name: bookingForm.client_name.trim(),
      email: bookingForm.email || null,
      phone: bookingForm.phone || null,
      package_id: bookingForm.package_id || null,
      package_name: selectedPkg?.name || bookingForm.package_name || null,
      message: bookingForm.message || null,
      status: bookingForm.status,
      source: bookingForm.source,
    }).select().single();

    if (!error && data) {
      setBookings(b => [data, ...b]);
      toast({ title: "Booking request logged!" });
    }
    setSaving(false);
    setBookingDialog(false);
    setBookingForm(emptyBooking);
  }

  async function updateBookingStatus(id: string, status: string) {
    const supabase = createClient();
    const { data } = await supabase.from("booking_requests").update({ status }).eq("id", id).select().single();
    if (data) setBookings(b => b.map(bk => bk.id === data.id ? data : bk));
  }

  const newBookings = bookings.filter(b => b.status === "New").length;

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/10 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{packages.filter(p => p.active).length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Active Packages</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bookings.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Total Inquiries</p>
        </div>
        <div className={`rounded-2xl p-3 text-center ${newBookings > 0 ? "bg-amber-100 dark:bg-amber-900/20" : "bg-muted/50"}`}>
          <p className={`text-2xl font-bold ${newBookings > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{newBookings}</p>
          <p className="text-[10px] text-muted-foreground font-medium">New Inquiries</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 bg-muted/50 rounded-2xl p-1">
        {[
          { key: "packages", label: "Packages" },
          { key: "bookings", label: `Inquiries${newBookings > 0 ? ` (${newBookings} new)` : ""}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "packages" | "bookings")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Packages tab */}
      {activeTab === "packages" && (
        <>
          <div className="flex justify-end">
            <Button onClick={openAddPackage} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Package
            </Button>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">No packages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your coaching packages to start accepting clients</p>
              <Button onClick={openAddPackage} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />Create Package
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => (
                <Card key={pkg.id} className={`card-hover ${!pkg.active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm text-foreground">{pkg.name}</h3>
                          {!pkg.active && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md">Inactive</span>}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-2">
                          <span className="capitalize">{pkg.type}</span>
                          {pkg.price_usd !== null && (
                            <span className="flex items-center gap-0.5 font-semibold text-foreground">
                              <DollarSign className="h-3 w-3" />{pkg.price_usd} {pkg.currency}
                            </span>
                          )}
                          {pkg.sessions_included && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />{pkg.sessions_included} sessions
                            </span>
                          )}
                          {pkg.duration_weeks && (
                            <span>{pkg.duration_weeks} weeks</span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditPackage(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => deletePackage(pkg.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bookings tab */}
      {activeTab === "bookings" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { setBookingForm(emptyBooking); setBookingDialog(true); }} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Log Inquiry
            </Button>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">No inquiries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Log booking requests as they come in from social media</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(booking => (
                <Card key={booking.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{booking.client_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {booking.package_name || "No package"} · {booking.source || "Direct"}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl shrink-0 ${STATUS_COLORS[booking.status] || ""}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex gap-3 flex-wrap mb-2">
                      {booking.email && (
                        <a href={`mailto:${booking.email}`} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                          <Mail className="h-3 w-3" />{booking.email}
                        </a>
                      )}
                      {booking.phone && (
                        <a href={`tel:${booking.phone}`} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                          <Phone className="h-3 w-3" />{booking.phone}
                        </a>
                      )}
                    </div>
                    {booking.message && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2 mb-2">&ldquo;{booking.message}&rdquo;</p>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {BOOKING_STATUSES.filter(s => s !== booking.status).map(s => (
                        <button
                          key={s}
                          onClick={() => updateBookingStatus(booking.id, s)}
                          className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          → {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{formatDate(booking.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Package Dialog */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Edit Package" : "New Coaching Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input placeholder="e.g. 4-Week Family Harmony Program" value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What does this package include? Who is it for?" value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input type="number" placeholder="e.g. 299" value={pkgForm.price_usd} onChange={e => setPkgForm(f => ({ ...f, price_usd: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={pkgForm.type} onValueChange={v => setPkgForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PACKAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sessions Included</Label>
                <Input type="number" placeholder="e.g. 8" value={pkgForm.sessions_included} onChange={e => setPkgForm(f => ({ ...f, sessions_included: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Duration (weeks)</Label>
                <Input type="number" placeholder="e.g. 4" value={pkgForm.duration_weeks} onChange={e => setPkgForm(f => ({ ...f, duration_weeks: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgDialog(false)}>Cancel</Button>
            <Button onClick={savePackage} disabled={saving}>{saving ? "Saving..." : editingPkg ? "Update" : "Create Package"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Booking Inquiry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input placeholder="e.g. Fatima Hassan" value={bookingForm.client_name} onChange={e => setBookingForm(f => ({ ...f, client_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@..." value={bookingForm.email} onChange={e => setBookingForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+252..." value={bookingForm.phone} onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={bookingForm.package_id} onValueChange={v => setBookingForm(f => ({ ...f, package_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={bookingForm.source} onValueChange={v => setBookingForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message / Notes</Label>
              <Textarea placeholder="What did they say? What are their main concerns?" value={bookingForm.message} onChange={e => setBookingForm(f => ({ ...f, message: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancel</Button>
            <Button onClick={saveBooking} disabled={saving}>{saving ? "Saving..." : "Log Inquiry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
