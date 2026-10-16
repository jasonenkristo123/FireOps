import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh, usePathname } = vi.hoisted(() => ({
  refresh: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname }));
const router = { refresh };

import { NotificationIndicator } from "./notification-indicator";

const fetchMock = vi.fn();
const snapshot = (unread: number) => ({
  modes: [
    { mode: "demo", unread, latest: null },
    { mode: "live", unread: 0, latest: null },
  ],
});
const response = (unread: number) => ({
  ok: true,
  status: 200,
  json: async () => snapshot(unread),
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  usePathname.mockReturnValue("/notifications");
  fetchMock.mockResolvedValue(response(1));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("durable notification refresh", () => {
  it("separates modes and refreshes the list only when the authoritative snapshot changes", async () => {
    render(<NotificationIndicator />);
    await act(async () => {});
    expect(
      screen.getByRole("link", { name: "Notifikasi DEMO: 1 belum dibaca" }),
    ).toHaveAttribute("href", "/notifications?mode=demo");
    expect(
      screen.getByRole("link", { name: "Notifikasi LIVE: 0 belum dibaca" }),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(refresh).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(response(2));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/notifications",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
  it("backs off failures, resumes after offline state, and never invents a new count", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<NotificationIndicator />);
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    online.mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByText(/Pembaruan tertunda/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValue(response(3));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("link", { name: /DEMO: 3 belum dibaca/ }),
    ).toBeInTheDocument();
  });
  it("stops polling and clears visible counts when authorization is revoked", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    render(<NotificationIndicator />);
    await act(async () => {});
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByText(/Sesi atau izin berubah/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("link", { name: /DEMO: 0 belum dibaca/ }),
    ).toBeInTheDocument();
  });
});
