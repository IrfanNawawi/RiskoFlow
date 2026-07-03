import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { useStore } from "@/data/store";
import * as seed from "@/data/seed";

// Mode mock (tanpa VITE_SUPABASE_* di test) — verifikasi alur login/logout lokal.
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ status: "loading", userId: null, email: null });
  useStore.setState({ currentUserId: seed.currentUserId });
});

describe("authStore (mock mode)", () => {
  it("initialize kunjungan pertama → auto-login sebagai user seed", () => {
    useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().userId).toBe(seed.currentUserId);
    expect(useStore.getState().currentUserId).toBe(seed.currentUserId);
    expect(localStorage.getItem("riskoflow-auth")).toBe(seed.currentUserId);
  });

  it("signOut menandai signed-out & initialize berikutnya → unauthenticated", async () => {
    useAuthStore.getState().initialize();
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(localStorage.getItem("riskoflow-auth")).toBe("signed-out");

    useAuthStore.setState({ status: "loading", userId: null });
    useAuthStore.getState().initialize();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });

  it("signInAsMockUser mengganti user aktif & mempersist pilihan", () => {
    const other = seed.users.find((u) => u.id !== seed.currentUserId)!;
    useAuthStore.getState().signInAsMockUser(other.id);
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().userId).toBe(other.id);
    expect(useStore.getState().currentUserId).toBe(other.id);
    expect(localStorage.getItem("riskoflow-auth")).toBe(other.id);
  });

  it("initialize memulihkan user tersimpan (bukan seed) setelah reload", () => {
    const other = seed.users.find((u) => u.id !== seed.currentUserId)!;
    localStorage.setItem("riskoflow-auth", other.id);
    useAuthStore.getState().initialize();
    expect(useAuthStore.getState().userId).toBe(other.id);
    expect(useStore.getState().currentUserId).toBe(other.id);
  });

  it("signInWithPassword ditolak di mode mock", async () => {
    const res = await useAuthStore.getState().signInWithPassword("a@b.id", "x");
    expect(res.ok).toBe(false);
  });

  it("signUpWithPassword ditolak di mode mock", async () => {
    const res = await useAuthStore.getState().signUpWithPassword("a@b.id", "secret6", "Budi");
    expect(res.ok).toBe(false);
  });
});
