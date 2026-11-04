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
        <h1 className="font-serif text-3xl font-bold">Topic modules</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">Loading modules…</p>
          ) : !modules.length ? (
            <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
              No modules yet. Use the Builder tab to package your first topic pack.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  owned={owns(m)}
                  onOpen={() => setOpenId(m.id)}
                />
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
