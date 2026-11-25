"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminGate } from "@/components/modules/admin-gate";
import { CheckoutDialog } from "@/components/modules/checkout-dialog";
import { ModuleBuilder } from "@/components/modules/module-builder";
import { ModuleCard } from "@/components/modules/module-card";
import { ModuleDetail } from "@/components/modules/module-detail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tilt } from "@/components/common/tilt";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { deleteModule, getAllModules, isPurchased, markPurchased, type Module } from "@/lib/supabase";

export function ModulesClient() {
  const { admin } = useAuth();
  const [modules, setModules] = useState<Module[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [checkout, setCheckout] = useState<Module | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  // Purchases live in localStorage, so a bump is what re-reads them.
  const [purchaseTick, setPurchaseTick] = useState(0);

  const refresh = useCallback(() => {
    getAllModules().then(setModules, (err) => {
      console.error("Modules: could not load:", err);
      setModules([]);
    });
  }, []);

  useEffect(refresh, [refresh]);

  const opened = modules?.find((m) => m.id === openId) ?? null;
  const owns = useCallback(
    (m: Module) => !m.premium || isPurchased(m.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchaseTick],
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[var(--sw-brass-light)] uppercase">
          Study packs
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-white">Topic modules</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Bundles of questions pulled from any paper in the bank, grouped around one topic. Free
          modules open straight away; premium modules unlock after checkout.
        </p>
      </header>

      <Tabs defaultValue="storefront">
        <TabsList>
          <TabsTrigger value="storefront">Storefront</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="storefront" className="grid gap-6 pt-4">
          {modules === null ? (
            <p className="text-sm text-white/60">Loading modules…</p>
          ) : !modules.length ? (
            <Card className="sw-sheet-in p-10 text-center text-sm text-muted-foreground shadow-[var(--sw-shadow-3)]">
              No modules yet. Use the Builder tab to package your first topic pack.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m, i) => (
                <Tilt
                  key={m.id}
                  className="sw-sheet-in h-full [&>div]:h-full [&_[data-slot=card]]:h-full"
                  max={7}
                >
                  <div style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <ModuleCard module={m} owned={owns(m)} onOpen={() => setOpenId(m.id)} />
                  </div>
                </Tilt>
              ))}
            </div>
          )}

          {opened && (
            <ModuleDetail
              module={opened}
              owned={owns(opened)}
              onUnlock={() => setCheckout(opened)}
            />
          )}
        </TabsContent>

        <TabsContent value="builder" className="pt-4">
          {admin ? (
            <ModuleBuilder modules={modules ?? []} onSaved={refresh} onDelete={setPendingDelete} />
          ) : (
            <AdminGate />
          )}
        </TabsContent>
      </Tabs>

      <CheckoutDialog
        module={checkout}
        onClose={() => setCheckout(null)}
        onConfirm={() => {
          if (checkout) markPurchased(checkout.id);
          setCheckout(null);
          setPurchaseTick((n) => n + 1);
        }}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              The underlying questions stay in the bank. Any values edited for this module are lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingDelete !== null) await deleteModule(pendingDelete);
                setPendingDelete(null);
                refresh();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
