"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function CancelBookingButton({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (status === "cancelled") return null;

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, status: "cancelled" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appuntamento annullato");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Errore nella cancellazione");
    }
    setCancelling(false);
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} className="gap-2">
        <XCircle className="h-4 w-4" />
        Annulla appuntamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annullare l&apos;appuntamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Questa azione imposta lo stato su &quot;Cancellata&quot;. Non verrà eliminato nessun dato.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={cancelling}>
              Indietro
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma annullamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
