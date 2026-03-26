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
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dettaglio prenotazione</h1>
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
      </div>
    </div>
  );
}
