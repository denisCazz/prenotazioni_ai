import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Phone, Clock, DollarSign } from "lucide-react";
import type { Tables } from "@/lib/types/database";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: rawCall } = await supabase
    .from("call_logs")
    .select("*")
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .single();

  if (!rawCall) notFound();

  const call = rawCall as Tables<"call_logs">;

  const outcomeLabels: Record<string, string> = {
    booking_created: "Prenotazione creata",
    booking_cancelled: "Prenotazione cancellata",
    booking_modified: "Prenotazione modificata",
    info_request: "Richiesta informazioni",
    failed: "Fallita",
    abandoned: "Abbandonata",
  };

  function formatDuration(seconds: number | null) {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} min ${s} sec`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calls">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dettaglio chiamata</h1>
          <p className="text-muted-foreground">
            {call.caller_phone || "Numero sconosciuto"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Telefono</span>
            </div>
            <p className="mt-1 font-medium">{call.caller_phone || "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Durata</span>
            </div>
            <p className="mt-1 font-medium">
              {formatDuration(call.duration_seconds)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Costo</span>
            </div>
            <p className="mt-1 font-medium">
              {call.cost ? `€${Number(call.cost).toFixed(4)}` : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <span className="text-sm text-muted-foreground">Esito</span>
            <div className="mt-1">
              {call.outcome ? (
                <Badge>{outcomeLabels[call.outcome] || call.outcome}</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni chiamata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Inizio</p>
              <p className="font-medium">
                {format(new Date(call.started_at), "d MMMM yyyy HH:mm:ss", {
                  locale: it,
                })}
              </p>
            </div>
            {call.ended_at && (
              <div>
                <p className="text-sm text-muted-foreground">Fine</p>
                <p className="font-medium">
                  {format(new Date(call.ended_at), "d MMMM yyyy HH:mm:ss", {
                    locale: it,
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">ID Vapi</p>
              <p className="font-mono text-xs">{call.vapi_call_id}</p>
            </div>
            {call.recording_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Registrazione</p>
                <audio controls className="w-full">
                  <source src={call.recording_url} />
                </audio>
              </div>
            )}
          </CardContent>
        </Card>

        {call.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{call.summary}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {call.transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Trascrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
              {call.transcript}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
