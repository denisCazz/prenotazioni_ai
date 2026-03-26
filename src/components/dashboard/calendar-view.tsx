"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Loader2, Phone, MapPin, Calendar,
  Clock, Wrench, ExternalLink, RefreshCw, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string;
  service_address?: string | null;
  notes?: string | null;
  stove_brand?: string | null;
  issue_description?: string | null;
  services?: { name: string } | null;
}

interface CalendarViewProps {
  businessId: string;
  services: { id: string; name: string }[];
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function CalendarView({ businessId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const startDate = format(days[0], "yyyy-MM-dd");
    const endDate = format(days[6], "yyyy-MM-dd");
    const params = new URLSearchParams();
    params.set("date_from", startDate);
    params.set("date_to", endDate);
    params.set("limit", "200");
    try {
      const res = await fetch(`/api/bookings?${params}`);
      const json = await res.json();
      setBookings(json.data || []);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0].getTime(), businessId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  function getBookingsForDay(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && b.status !== "cancelled");
  }

  function getTopPosition(time: string) {
    const [h, m] = time.split(":").map(Number);
    return ((h - 7) * 60 + m) * (64 / 60);
  }

  function getHeight(start: string, end: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max((eh * 60 + em - sh * 60 - sm) * (64 / 60), 24);
  }

  function openBookingDetail(booking: Booking) {
    setSelectedBooking(booking);
    setSheetOpen(true);
  }

  function openRescheduleDialog() {
    if (!selectedBooking) return;
    setRescheduleDate(selectedBooking.date);
    setRescheduleTime(selectedBooking.start_time.slice(0, 5));
    setRescheduleOpen(true);
  }

  async function handleReschedule() {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    try {
      const [h, m] = rescheduleTime.split(":").map(Number);
      const endDt = new Date(2000, 0, 1, h, m + 60);
      const endTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`;
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBooking.id,
          date: rescheduleDate,
          start_time: rescheduleTime,
          end_time: endTime,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appuntamento spostato");
      setRescheduleOpen(false);
      setSheetOpen(false);
      fetchBookings();
    } catch {
      toast.error("Errore nel salvataggio");
    }
    setRescheduling(false);
  }

  async function handleCancel() {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedBooking.id, status: "cancelled" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appuntamento annullato");
      setCancelOpen(false);
      setSheetOpen(false);
      fetchBookings();
    } catch {
      toast.error("Errore nella cancellazione");
    }
    setCancelling(false);
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold ml-2">
              {format(weekStart, "d MMMM", { locale: it })} &ndash;{" "}
              {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: it })}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Oggi
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Day headers */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
                  <div className="border-r p-2" />
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "border-r p-2 text-center",
                        isSameDay(day, new Date()) && "bg-primary/10"
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {format(day, "EEE", { locale: it })}
                      </div>
                      <div
                        className={cn(
                          "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                          isSameDay(day, new Date())
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
                  {/* Hour labels */}
                  <div className="border-r">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="h-16 border-b px-2 text-right text-xs text-muted-foreground leading-none pt-1"
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {days.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative border-r",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                      >
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-16 border-b border-border/40" />
                        ))}
                        {dayBookings.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => openBookingDetail(booking)}
                            className={cn(
                              "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-xs overflow-hidden cursor-pointer transition-all text-left",
                              "hover:ring-2 hover:ring-primary/50 hover:shadow-md hover:z-10",
                              booking.source === "phone_ai"
                                ? "bg-indigo-100 border-l-2 border-indigo-500 text-indigo-900"
                                : "bg-emerald-100 border-l-2 border-emerald-500 text-emerald-900"
                            )}
                            style={{
                              top: `${getTopPosition(booking.start_time)}px`,
                              height: `${getHeight(booking.start_time, booking.end_time)}px`,
                            }}
                          >
                            <div className="font-semibold truncate leading-tight">
                              {booking.customer_name}
                            </div>
                            <div className="truncate opacity-70 leading-tight text-[11px]">
                              {booking.start_time.slice(0, 5)}
                              {booking.services?.name ? ` · ${booking.services.name}` : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-[440px] overflow-y-auto" side="right">
          {selectedBooking && (
            <div className="p-6 space-y-5">
              <SheetHeader className="p-0">
                <SheetTitle className="text-lg">{selectedBooking.customer_name}</SheetTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit text-xs mt-1",
                    selectedBooking.source === "phone_ai"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {selectedBooking.source === "phone_ai" ? "Chiamata AI" : "Manuale"}
                </Badge>
              </SheetHeader>

              <div className="space-y-3 rounded-xl border p-4 bg-muted/30">
                <InfoRow icon={Phone} label="Telefono" value={selectedBooking.customer_phone} />
                <InfoRow
                  icon={Calendar}
                  label="Data"
                  value={format(
                    new Date(selectedBooking.date + "T00:00:00"),
                    "EEEE d MMMM yyyy",
                    { locale: it }
                  )}
                />
                <InfoRow
                  icon={Clock}
                  label="Orario"
                  value={`${selectedBooking.start_time.slice(0, 5)} – ${selectedBooking.end_time.slice(0, 5)}`}
                />
                {selectedBooking.service_address && (
                  <InfoRow icon={MapPin} label="Indirizzo" value={selectedBooking.service_address} />
                )}
                {selectedBooking.services?.name && (
                  <InfoRow icon={Wrench} label="Servizio" value={selectedBooking.services.name} />
                )}
                {selectedBooking.stove_brand && (
                  <InfoRow icon={Wrench} label="Stufa" value={selectedBooking.stove_brand} />
                )}
              </div>

              {(selectedBooking.issue_description || selectedBooking.notes) && (
                <div className="rounded-xl border p-4 space-y-3">
                  {selectedBooking.issue_description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Problema segnalato</p>
                      <p className="text-sm">{selectedBooking.issue_description}</p>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Note</p>
                      <p className="text-sm">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {selectedBooking.status === "confirmed" && (
                  <Button onClick={openRescheduleDialog} className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Sposta appuntamento
                  </Button>
                )}
                <Link href={`/bookings/${selectedBooking.id}`} onClick={() => setSheetOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Dettaglio completo
                  </Button>
                </Link>
                {selectedBooking.status !== "cancelled" && (
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setCancelOpen(true)}
                  >
                    <Ban className="h-4 w-4" />
                    Annulla appuntamento
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annullare l&apos;appuntamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Questa azione imposta lo stato su &quot;Cancellata&quot;. Non verrà eliminato nessun dato.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Indietro
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma annullamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sposta appuntamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nuova data</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nuovo orario di inizio</Label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              La durata dell&apos;appuntamento (60 min) verrà mantenuta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduling || !rescheduleDate || !rescheduleTime}
            >
              {rescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
