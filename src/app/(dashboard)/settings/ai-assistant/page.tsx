"use client";

import { useState, useEffect } from "react";
import { getDefaultSystemPrompt } from "@/lib/vapi/tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Bot, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  type: string;
  vapi_assistant_id: string | null;
  system_prompt: string | null;
  settings: Record<string, unknown> | null;
}

interface BusinessUpdateResponse extends Business {
  vapiSyncError?: string;
}

export default function AIAssistantPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data);
        setSystemPrompt(data.system_prompt || getDefaultSystemPrompt(data.name, data.type));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: systemPrompt }),
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
        toast.warning(`Prompt salvato, ma sync Vapi fallito: ${result.vapiSyncError}`);
      } else {
        toast.success("Prompt salvato e assistente Vapi aggiornato");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    }
    setSaving(false);
  }

  function resetToDefault() {
    if (!business) return;
    setSystemPrompt(getDefaultSystemPrompt(business.name, business.type));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assistente AI</h1>
        <p className="text-muted-foreground">
          Configura il comportamento dell&apos;assistente vocale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            System Prompt
          </CardTitle>
          <CardDescription>
            Istruzioni che definiscono il comportamento dell&apos;assistente AI durante le chiamate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
            placeholder="Inserisci il system prompt..."
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetToDefault}>
              Ripristina default
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salva prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Configurazione voce
          </CardTitle>
          <CardDescription>
            Impostazioni della voce dell&apos;assistente (configurate su Vapi.ai)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider voce</Label>
              <Input value="ElevenLabs" readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Lingua</Label>
              <Input value="Italiano" readOnly className="bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Modello LLM</Label>
              <Input value="GPT-4o" readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Speech-to-Text</Label>
              <Input value="Deepgram" readOnly className="bg-muted" />
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Per modificare le impostazioni avanzate della voce, accedi alla{" "}
            <a
              href="https://dashboard.vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              dashboard di Vapi.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
