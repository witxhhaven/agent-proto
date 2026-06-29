"use client";

import { useSyncExternalStore } from "react";

export type ServiceId =
  | "outlook"
  | "gmail"
  | "gdrive"
  | "onedrive"
  | "sharepoint";

export interface ServiceAccount {
  id: ServiceId;
  label: string; // "Gmail"
  email: string; // mocked signed-in account
  brand: "google" | "microsoft"; // drives the brand icon
  connected: boolean;
}

// Session-only connection state (deliberately NOT persisted): Microsoft 365
// services start connected as alvin_leu@tech.gov.sg; Google Workspace services
// start disconnected so the Connect → spinner → connected flow can be demoed.
// Each service connects independently. Resets to this on every full reload.
let state: Record<ServiceId, ServiceAccount> = {
  outlook: {
    id: "outlook",
    label: "Outlook",
    email: "alvin_leu@tech.gov.sg",
    brand: "microsoft",
    connected: true,
  },
  gmail: {
    id: "gmail",
    label: "Gmail",
    email: "alvin.leu@gt.tech.gov.sg",
    brand: "google",
    connected: false,
  },
  gdrive: {
    id: "gdrive",
    label: "Google Drive",
    email: "alvin.leu@gt.tech.gov.sg",
    brand: "google",
    connected: false,
  },
  onedrive: {
    id: "onedrive",
    label: "OneDrive",
    email: "alvin_leu@tech.gov.sg",
    brand: "microsoft",
    connected: true,
  },
  sharepoint: {
    id: "sharepoint",
    label: "SharePoint",
    email: "alvin_leu@tech.gov.sg",
    brand: "microsoft",
    connected: true,
  },
};

// Which services belong to each lumped intake step.
export const EMAIL_SERVICES: ServiceId[] = ["outlook", "gmail"];
export const DRIVE_SERVICES: ServiceId[] = ["gdrive", "onedrive", "sharepoint"];

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

/** Simulate an OAuth connect: a 2-second delay, then mark it connected. */
export function connectService(id: ServiceId): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      state = { ...state, [id]: { ...state[id], connected: true } };
      emit();
      resolve();
    }, 2000);
  });
}

export function useConnectors(): Record<ServiceId, ServiceAccount> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
