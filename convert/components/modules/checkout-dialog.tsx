"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Module } from "@/lib/supabase";

type CheckoutDialogProps = {
  module: Module | null;
  onClose: () => void;
  onConfirm: () => void;
};

/** A mock checkout: the purchase flag lives in this browser only. */
export function CheckoutDialog({ module, onClose, onConfirm }: CheckoutDialogProps) {
  return (
    <Dialog open={Boolean(module)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock &ldquo;{module?.title}&rdquo;</DialogTitle>
          <DialogDescription>
            One-time purchase. Unlocks all {module?.questionUids.length} questions with full mark
            schemes and worked solutions, on this device.
          </DialogDescription>
        </DialogHeader>

        <p className="font-serif text-3xl font-bold text-primary">
          {module?.currency}
          {module?.price}
        </p>
        <p className="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
          Demo checkout, no real payment is taken. Connect a payment provider before selling.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm demo purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
