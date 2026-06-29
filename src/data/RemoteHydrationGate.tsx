import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useStore } from "@/data/store";
import { fetchSnapshot, SNAPSHOT_KEY } from "@/data/remote";

/**
 * Gerbang hidrasi: saat Supabase terkonfigurasi, ambil snapshot DB lalu isi Zustand
 * store sebelum merender app. Membuat halaman berbasis store (dashboard, audit, reports,
 * switcher, label user/departemen) mencerminkan DB tanpa mengubah komponennya.
 * Mode mock (env kosong) → render langsung memakai seed.
 */
export function RemoteHydrationGate({ children }: { children: ReactNode }) {
  const hydrate = useStore((s) => s.hydrate);
  const { isPending, isError, error, refetch } = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: async () => {
      const snap = await fetchSnapshot();
      hydrate(snap);
      return snap;
    },
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });

  if (!isSupabaseConfigured) return <>{children}</>;
  if (isPending) return <Centered>Memuat data dari Supabase…</Centered>;
  if (isError) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] font-semibold text-error">Gagal memuat data dari Supabase.</p>
          <p className="max-w-md text-[12px] text-text-secondary">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-on-primary">
            Coba lagi
          </button>
        </div>
      </Centered>
    );
  }
  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-[14px] text-text-secondary">{children}</div>
  );
}
