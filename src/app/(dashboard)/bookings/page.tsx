"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, X, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string;
  notes: string | null;
  created_at: string;
  services?: { name: string } | null;
  service_address?: string | null;
  urgency_level?: string | null;
}

const statusLabels: Record<string, string> = {
  confirmed: "Confermata",
  cancelled: "Cancellata",
  completed: "Completata",
  no_show: "Non presentato",
};

const statusClasses: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  no_show: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customer_name: "",
    customer_phone: "",
    date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/bookings?${params}`);
      const json = await res.json();
      setBookings(json.data || []);
      setTotal(json.total || 0);
    } catch {
      toast.error("Errore nel caricamento delle prenotazioni");
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stato aggiornato");
      fetchBookings();
    } catch {
      toast.error("Errore nell'aggiornamento");
    }
  }

  async function handleCreateBooking() {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBooking),
      });
      if (!res.ok) throw new Error();
      toast.success("Prenotazione creata");
      setDialogOpen(false);
      setNewBooking({
        customer_name: "",
        customer_phone: "",
        date: "",
        start_time: "",
        end_time: "",
        notes: "",
      });
      fetchBookings();
    } catch {
      toast.error("Errore nella creazione");
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <p className="text-muted-foreground">
            Gestisci tutte le prenotazioni
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuova prenotazione
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova prenotazione</DialogTitle>
              <DialogDescription>
                Crea una prenotazione manuale
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome cliente</Label>
                <Input
                  value={newBooking.customer_name}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, customer_name: e.target.value })
                  }
                  placeholder="Mario Rossi"
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefono</Label>
                <Input
                  value={newBooking.customer_phone}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, customer_phone: e.target.value })
                  }
                  placeholder="+39 333 1234567"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newBooking.date}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Inizio</Label>
                  <Input
                    type="time"
                    value={newBooking.start_time}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, start_time: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fine</Label>
                  <Input
                    type="time"
                    value={newBooking.end_time}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, end_time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Note</Label>
                <Textarea
                  value={newBooking.notes}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, notes: e.target.value })
                  }
                  placeholder="Note opzionali..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateBooking}>Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o telefono..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="confirmed">Confermata</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="cancelled">Cancellata</SelectItem>
                <SelectItem value="no_show">Non presentato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">
              Nessuna prenotazione trovata
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Indirizzo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer hover:bg-accent/40 transition-colors"
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.customer_phone}
                            </p>
                          </div>
                          {booking.urgency_level === "urgent" && (
                            <span title="Urgente">
                              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.date + "T00:00:00"), "d MMM yyyy", {
                          locale: it,
                        })}
                      </TableCell>
                      <TableCell>
                        {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        {booking.service_address ? (
                          <p className="truncate text-sm text-muted-foreground" title={booking.service_address}>
                            {booking.service_address}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses[booking.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabels[booking.status] || booking.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={booking.source === "phone_ai" ? "default" : "outline"}>
                          {booking.source === "phone_ai" ? "AI" : booking.source === "dashboard" ? "Dashboard" : "Manuale"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {booking.status === "confirmed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(booking.id, "completed"); }}
                                title="Segna come completata"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(booking.id, "cancelled"); }}
                                title="Cancella"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {total} prenotazioni totali
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Precedente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Successiva
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
