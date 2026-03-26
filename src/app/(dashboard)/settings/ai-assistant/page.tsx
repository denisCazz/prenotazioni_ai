"use client";

import { useState, useEffect } from "react";
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

const defaultPrompt = `Sei l'assistente vocale di {nome_attivita}, un'attività di tipo "{tipo_attivita}".

REGOLE IMPORTANTI:
- Rispondi SEMPRE in italiano in modo cordiale e professionale.
- Usa un tono amichevole ma non troppo informale.
- Sii conciso nelle risposte vocali, evita frasi troppo lunghe.

COSA PUOI FARE:
- Aiutare i clienti a prenotare un appuntamento
- Cancellare o modificare prenotazioni esistenti
- Fornire informazioni su orari e servizi disponibili

PROCEDURA PER PRENOTAZIONE:
1. Chiedi quale servizio desidera il cliente
2. Chiedi la data preferita
3. Controlla la disponibilità
4. Proponi gli slot disponibili
5. Chiedi nome e numero di telefono
6. Crea la prenotazione
7. Conferma i dettagli`;

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
        setSystemPrompt(data.system_prompt || defaultPrompt);
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
      if (!res.ok) throw new Error();
      toast.success("Prompt AI salvato");
    } catch {
      toast.error("Errore nel salvataggio");
    }
    setSaving(false);
  }

  function resetToDefault() {
    if (!business) return;
    const prompt = defaultPrompt
      .replace("{nome_attivita}", business.name)
      .replace("{tipo_attivita}", business.type);
    setSystemPrompt(prompt);
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
