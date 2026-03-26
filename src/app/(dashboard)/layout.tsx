import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, type")
    .eq("id", profile.business_id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        businessName={business?.name || "La mia attività"}
        businessType={business?.type || ""}
        userName={profile.full_name}
        userRole={profile.role}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={profile.full_name} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
