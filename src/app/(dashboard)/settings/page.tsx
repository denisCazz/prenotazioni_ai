"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  type: string;
  phone_number: string | null;
  address: string | null;
  vapi_assistant_id: string | null;
  system_prompt: string | null;
}

interface BusinessUpdateResponse extends Business {
  vapiSyncError?: string;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: business.name,
          type: business.type,
          phone_number: business.phone_number,
          address: business.address,
        }),
      });

      const result = (await res.json().catch(() => null)) as BusinessUpdateResponse | { error?: string } | null;

      if (!res.ok) {
        throw new Error(
          (result && "vapiSyncError" in result && result.vapiSyncError) ||
            (result && "error" in result && result.error) ||
            "Errore nel salvataggio"
        );
      }

      if (result && "vapiSyncError" in result && result.vapiSyncError) {
        toast.warning(`Impostazioni salvate, ma sync Vapi fallito: ${result.vapiSyncError}`);
      } else {
        toast.success("Impostazioni salvate e assistente Vapi aggiornato");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nessuna attività configurata
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni generali</h1>
        <p className="text-muted-foreground">
          Configura le informazioni della tua attività
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni attività</CardTitle>
          <CardDescription>
            Queste informazioni vengono utilizzate dall&apos;assistente AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome attività</Label>
              <Input
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo attività</Label>
              <Input
                value={business.type}
                onChange={(e) => setBusiness({ ...business, type: e.target.value })}
                placeholder="ristorante, parrucchiere, studio medico..."
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Numero di telefono</Label>
              <Input
                value={business.phone_number || ""}
                onChange={(e) =>
                  setBusiness({ ...business, phone_number: e.target.value })
                }
                placeholder="+39 02 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Indirizzo</Label>
              <Input
                value={business.address || ""}
                onChange={(e) =>
                  setBusiness({ ...business, address: e.target.value })
                }
                placeholder="Via Roma 1, Milano"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salva
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrazione Vapi</CardTitle>
          <CardDescription>
            ID dell&apos;assistente Vapi collegato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Vapi Assistant ID</Label>
            <Input
              value={business.vapi_assistant_id || ""}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Questo ID viene configurato automaticamente durante il setup iniziale
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
