"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Phone, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

interface CallLog {
  id: string;
  vapi_call_id: string;
  caller_phone: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  outcome: string | null;
  recording_url: string | null;
  cost: number | null;
}

const outcomeLabels: Record<string, string> = {
  booking_created: "Prenotazione creata",
  booking_cancelled: "Prenotazione cancellata",
  booking_modified: "Prenotazione modificata",
  info_request: "Richiesta info",
  failed: "Fallita",
  abandoned: "Abbandonata",
};

const outcomeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  booking_created: "default",
  booking_cancelled: "destructive",
  booking_modified: "secondary",
  info_request: "outline",
  failed: "destructive",
  abandoned: "outline",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/call-logs?page=${page}&limit=20`);
      const json = await res.json();
      setCalls(json.data || []);
      setTotal(json.total || 0);
    } catch {
      setCalls([]);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  function formatDuration(seconds: number | null) {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storico chiamate</h1>
        <p className="text-muted-foreground">
          Tutte le chiamate gestite dall&apos;assistente AI
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chiamate totali
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Durata media
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.length > 0
                ? formatDuration(
                    Math.round(
                      calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) /
                        calls.length
                    )
                  )
                : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prenotazioni da AI
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calls.filter((c) => c.outcome === "booking_created").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">
              Nessuna chiamata registrata
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Durata</TableHead>
                    <TableHead>Esito</TableHead>
                    <TableHead>Riepilogo</TableHead>
                    <TableHead className="text-right">Dettagli</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">
                        {call.caller_phone || "Sconosciuto"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(call.started_at), "d MMM yyyy HH:mm", {
                          locale: it,
                        })}
                      </TableCell>
                      <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                      <TableCell>
                        {call.outcome ? (
                          <Badge variant={outcomeVariants[call.outcome] || "secondary"}>
                            {outcomeLabels[call.outcome] || call.outcome}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {call.summary || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/calls/${call.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {total} chiamate totali
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
