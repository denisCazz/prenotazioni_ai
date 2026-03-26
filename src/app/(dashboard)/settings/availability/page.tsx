"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2, Clock, CalendarOff } from "lucide-react";
import { toast } from "sonner";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AvailabilityException {
  id: string;
  date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const dayNames = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotDialog, setSlotDialog] = useState(false);
  const [exceptionDialog, setExceptionDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({ day_of_week: 0, start_time: "09:00", end_time: "18:00" });
  const [newException, setNewException] = useState({ date: "", is_closed: true, reason: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/availability");
      const data = await res.json();
      setSlots(data.slots || []);
      setExceptions(data.exceptions || []);
    } catch {
      toast.error("Errore nel caricamento");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addSlot() {
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSlot, start_time: newSlot.start_time + ":00", end_time: newSlot.end_time + ":00" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fascia oraria aggiunta");
      setSlotDialog(false);
      fetchData();
    } catch {
      toast.error("Errore");
    }
  }

  async function addException() {
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "exception", ...newException }),
      });
      if (!res.ok) throw new Error();
      toast.success("Eccezione aggiunta");
      setExceptionDialog(false);
      fetchData();
    } catch {
      toast.error("Errore");
    }
  }

  async function deleteItem(id: string, type: "slot" | "exception") {
    try {
      const res = await fetch(
        `/api/availability?id=${id}${type === "exception" ? "&type=exception" : ""}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Eliminato");
      fetchData();
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const groupedSlots = dayNames.map((name, i) => ({
    name,
    dayIndex: i,
    slots: slots.filter((s) => s.day_of_week === i),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orari e disponibilità</h1>
        <p className="text-muted-foreground">
          Configura gli orari di apertura e le eccezioni
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Fasce orarie settimanali
            </CardTitle>
            <CardDescription>
              Orari in cui è possibile prenotare
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setSlotDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedSlots.map((day) => (
              <div key={day.dayIndex}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium w-24">{day.name}</span>
                  {day.slots.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Chiuso</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {day.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
                        >
                          <span>
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => deleteItem(slot.id, "slot")}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {day.dayIndex < 6 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Eccezioni e chiusure
            </CardTitle>
            <CardDescription>
              Giorni di chiusura, ferie, orari speciali
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setExceptionDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessuna eccezione configurata
            </p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((exc) => (
                <div
                  key={exc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{exc.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {exc.is_closed
                        ? "Chiuso"
                        : `${exc.start_time?.slice(0, 5)} - ${exc.end_time?.slice(0, 5)}`}
                      {exc.reason && ` - ${exc.reason}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteItem(exc.id, "exception")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={slotDialog} onOpenChange={setSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova fascia oraria</DialogTitle>
            <DialogDescription>Aggiungi una fascia oraria settimanale</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Giorno</Label>
              <Select
                value={String(newSlot.day_of_week)}
                onValueChange={(v) =>
                  setNewSlot({ ...newSlot, day_of_week: parseInt(v ?? "0", 10) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Apertura</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Chiusura</Label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialog(false)}>Annulla</Button>
            <Button onClick={addSlot}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exceptionDialog} onOpenChange={setExceptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova eccezione</DialogTitle>
            <DialogDescription>Aggiungi un giorno di chiusura o orario speciale</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={newException.date}
                onChange={(e) => setNewException({ ...newException, date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newException.is_closed}
                onCheckedChange={(checked) => setNewException({ ...newException, is_closed: checked })}
              />
              <Label>Giorno di chiusura completo</Label>
            </div>
            <div className="grid gap-2">
              <Label>Motivo (opzionale)</Label>
              <Input
                value={newException.reason}
                onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                placeholder="es. Ferie, festività..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialog(false)}>Annulla</Button>
            <Button onClick={addException}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
