"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  description: string | null;
  max_concurrent: number;
  active: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({
    name: "",
    duration_minutes: 30,
    description: "",
    max_concurrent: 1,
    active: true,
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data || []);
    } catch {
      toast.error("Errore nel caricamento");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      duration_minutes: service.duration_minutes,
      description: service.description || "",
      max_concurrent: service.max_concurrent,
      active: service.active,
    });
    setDialogOpen(true);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", duration_minutes: 30, description: "", max_concurrent: 1, active: true });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        const res = await fetch("/api/services", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        if (!res.ok) throw new Error();
        toast.success("Servizio aggiornato");
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success("Servizio creato");
      }
      setDialogOpen(false);
      fetchServices();
    } catch {
      toast.error("Errore nel salvataggio");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;
    try {
      const res = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Servizio eliminato");
      fetchServices();
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servizi</h1>
          <p className="text-muted-foreground">
            Gestisci i servizi offerti dalla tua attività
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo servizio
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica servizio" : "Nuovo servizio"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modifica le informazioni del servizio"
                : "Aggiungi un nuovo servizio"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="es. Taglio capelli, Visita generale..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Durata (minuti)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Max contemporanei</Label>
                <Input
                  type="number"
                  value={form.max_concurrent}
                  onChange={(e) =>
                    setForm({ ...form, max_concurrent: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descrizione</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrizione opzionale..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
              <Label>Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Nessun servizio configurato. Aggiungi il primo servizio.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className={!service.active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <CardDescription>{service.duration_minutes} minuti</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(service)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {service.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Max: {service.max_concurrent} contemporanei</span>
                  <span>{service.active ? "Attivo" : "Disattivato"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
