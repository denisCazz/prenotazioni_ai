import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { geocodeAddress } from "@/lib/utils/geocoding";
import { listAssistants } from "@/lib/vapi/client";
import { setupVapiAssistant, updateVapiAssistant } from "@/lib/vapi/setup";
import { NextResponse } from "next/server";

function normalizeAssistantName(value: string) {
  return value.trim().toLowerCase();
}

async function resolveVapiAssistantId(
  business: Tables<"businesses">,
  serverBaseUrl: string,
  supabase: ReturnType<typeof createAdminClient>
) {
  if (business.vapi_assistant_id) {
    return business.vapi_assistant_id;
  }

  const assistantNames = new Set([
    normalizeAssistantName(business.name),
    normalizeAssistantName(`Assistente ${business.name}`),
  ]);

  const assistants = await listAssistants();
  const matchingAssistant = assistants.find((assistant) => {
    if (!assistant.name) return false;
    return assistantNames.has(normalizeAssistantName(assistant.name));
  });

  const createdAssistant = matchingAssistant
    ? null
    : ((await setupVapiAssistant({
        businessName: business.name,
        businessType: business.type,
        serverBaseUrl,
        customSystemPrompt: business.system_prompt || undefined,
      })) as { id?: string } | null);

  const assistantId = matchingAssistant?.id || createdAssistant?.id;

  if (!assistantId) {
    throw new Error("Impossibile determinare l'assistant Vapi da collegare");
  }

  const { error } = await supabase
    .from("businesses")
    .update({ vapi_assistant_id: assistantId })
    .eq("id", business.id);

  if (error) {
    throw new Error(`Impossibile salvare l'assistant Vapi collegato: ${error.message}`);
  }

  return assistantId;
}

export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const supabase = createAdminClient();

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", profile.business_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const body = await request.json();

  // If address changed, geocode it and update lat/lng
  const updatePayload = { ...body };
  if (typeof body.address === "string" && body.address.trim()) {
    const coords = await geocodeAddress(body.address);
    if (coords) {
      updatePayload.latitude = coords.lat;
      updatePayload.longitude = coords.lng;
    }
  }

  const { data, error } = await supabase
    .from("businesses")
    .update(updatePayload)
    .eq("id", profile.business_id)
    .select()
    .single();

  const business = (data as Tables<"businesses"> | null) ?? null;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const serverBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  let syncedBusiness = business;

  if (business && serverBaseUrl) {
    try {
      const assistantId = await resolveVapiAssistantId(business, serverBaseUrl, supabase);

      if (assistantId !== business.vapi_assistant_id) {
        syncedBusiness = {
          ...business,
          vapi_assistant_id: assistantId,
        };
      }

      await updateVapiAssistant(assistantId, {
        businessName: business.name,
        businessType: business.type,
        serverBaseUrl,
        customSystemPrompt: business.system_prompt || undefined,
      });
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Errore sconosciuto durante il sync con Vapi";
      return NextResponse.json(
        {
          ...syncedBusiness,
          vapiSyncError: message,
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(syncedBusiness);
}
