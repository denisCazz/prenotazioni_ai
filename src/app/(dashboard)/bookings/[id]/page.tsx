import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { Tables } from "@/lib/types/database";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Wrench, AlertTriangle } from "lucide-react";
import { CancelBookingButton } from "./cancel-button";

type BookingDetail = Tables<"bookings"> & {
  services: { name: string } | null;
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .single();

  const booking = data as BookingDetail | null;

  if (!booking) notFound();

  const statusLabels: Record<string, string> = {
    confirmed: "Confermata",
    cancelled: "Cancellata",
    completed: "Completata",
    no_show: "Non presentato",
  };

  const urgencyLabel = booking.urgency_level === "urgent" ? "Urgente" : booking.urgency_level === "planned" ? "Programmato" : null;
  const customerStatusLabel = booking.customer_status === "new" ? "Nuovo cliente" : booking.customer_status === "existing" ? "Cliente esistente" : null;

  const mapSrc =
    booking.latitude && booking.longitude
      ? `https://maps.google.com/maps?q=${booking.latitude},${booking.longitude}&output=embed&z=16`
      : booking.service_address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(booking.service_address + ", Italia")}&output=embed&z=16`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Dettaglio prenotazione</h1>
            {urgencyLabel && (
              <Badge variant={booking.urgency_level === "urgent" ? "destructive" : "secondary"}>
                {booking.urgency_level === "urgent" && <AlertTriangle className="mr-1 h-3 w-3" />}
                {urgencyLabel}
              </Badge>
            )}
            </div>
            <CancelBookingButton bookingId={booking.id} status={booking.status} />
          </div>
          <p className="text-muted-foreground">ID: {booking.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{booking.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefono</p>
              <p className="font-medium">{booking.customer_phone}</p>
            </div>
            {customerStatusLabel && (
              <div>
                <p className="text-sm text-muted-foreground">Tipologia</p>
                <Badge variant="outline">{customerStatusLabel}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dettagli prenotazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">
                {format(new Date(booking.date + "T00:00:00"), "EEEE d MMMM yyyy", {
                  locale: it,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orario</p>
              <p className="font-medium">
                {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stato</p>
              <Badge>{statusLabels[booking.status] || booking.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fonte</p>
              <Badge variant="outline">
                {booking.source === "phone_ai"
                  ? "Chiamata AI"
                  : booking.source === "dashboard"
                  ? "Dashboard"
                  : "Manuale"}
              </Badge>
            </div>
            {booking.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Note</p>
                <p className="text-sm">{booking.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Creata il</p>
              <p className="text-sm">
                {format(new Date(booking.created_at), "d MMM yyyy HH:mm", {
                  locale: it,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {(booking.stove_brand || booking.stove_model || booking.issue_description) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Dettagli intervento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.stove_brand && (
                <div>
                  <p className="text-sm text-muted-foreground">Marca stufa</p>
                  <p className="font-medium">{booking.stove_brand}</p>
                </div>
              )}
              {booking.stove_model && (
                <div>
                  <p className="text-sm text-muted-foreground">Modello</p>
                  <p className="font-medium">{booking.stove_model}</p>
                </div>
              )}
              {booking.issue_description && (
                <div>
                  <p className="text-sm text-muted-foreground">Problema / descrizione</p>
                  <p className="text-sm">{booking.issue_description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(booking.service_address || mapSrc) && (
          <Card className={mapSrc ? "md:col-span-2" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Indirizzo intervento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.service_address && (
                <p className="font-medium">{booking.service_address}</p>
              )}
              {mapSrc && (
                <div className="overflow-hidden rounded-lg border">
                  <iframe
                    src={mapSrc}
                    width="100%"
                    height="300"
                    className="block"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mappa intervento"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
