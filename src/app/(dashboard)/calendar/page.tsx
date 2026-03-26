import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { CalendarView } from "@/components/dashboard/calendar-view";

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .eq("business_id", profile.business_id)
    .eq("active", true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-muted-foreground">
          Visualizza le prenotazioni nel calendario
        </p>
      </div>
      <CalendarView
        businessId={profile.business_id}
        services={services || []}
      />
    </div>
  );
}
