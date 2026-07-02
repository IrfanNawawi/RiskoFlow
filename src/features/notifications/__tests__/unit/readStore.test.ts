import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationReadStore } from "@/features/notifications/store";

const KEY = "riskoflow-notif-read";

beforeEach(() => {
  localStorage.clear();
  useNotificationReadStore.setState({ readIds: new Set() });
});

describe("useNotificationReadStore", () => {
  it("markRead menggabungkan id & tidak menduplikasi", () => {
    useNotificationReadStore.getState().markRead(["a", "b"]);
    useNotificationReadStore.getState().markRead(["b", "c"]);
    expect([...useNotificationReadStore.getState().readIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("markRead tak mengubah referensi state saat semua id sudah dibaca", () => {
    useNotificationReadStore.getState().markRead(["a"]);
    const before = useNotificationReadStore.getState().readIds;
    useNotificationReadStore.getState().markRead(["a"]);
    expect(useNotificationReadStore.getState().readIds).toBe(before); // hindari re-render
  });

  it("mempersist readIds ke localStorage sebagai array (Set diserialisasi)", () => {
    useNotificationReadStore.getState().markRead(["x", "y"]);
    const raw = localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.readIds.__set.sort()).toEqual(["x", "y"]);
  });

  it("merehidrasi readIds dari localStorage sebagai Set (bertahan lintas reload)", () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { readIds: { __set: ["p", "q"] } }, version: 1 }));
    useNotificationReadStore.persist.rehydrate();
    const { readIds } = useNotificationReadStore.getState();
    expect(readIds).toBeInstanceOf(Set);
    expect(readIds.has("p")).toBe(true);
    expect(readIds.has("q")).toBe(true);
  });
});
