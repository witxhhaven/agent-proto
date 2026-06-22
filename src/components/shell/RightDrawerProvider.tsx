"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

interface RightDrawerOpts {
  title?: string;
  width?: number;
}

export interface RightDrawerApi {
  open: (content: ReactNode, opts?: RightDrawerOpts) => void;
  close: () => void;
  isOpen: boolean;
  content: ReactNode;
  title?: string;
  width: number;
}

const RightDrawerContext = createContext<RightDrawerApi | null>(null);

/**
 * Holds the right-drawer state. The panel itself is rendered by AppFrame as an
 * AppShell.Aside so it *pushes* the main content (resizes the layout) rather
 * than floating over it — see AppFrame.
 */
export function RightDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [width, setWidth] = useState<number>(420);

  const open = useCallback((node: ReactNode, opts?: RightDrawerOpts) => {
    setContent(node);
    setTitle(opts?.title);
    setWidth(opts?.width ?? 420);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // The drawer (e.g. AI assist) belongs to the page that opened it. Close it on
  // any route change so it doesn't leak onto Connectors, Scheduled, Marketplace,
  // etc. Clearing content also drops the previous page's drawer from memory.
  const pathname = usePathname();
  useEffect(() => {
    setIsOpen(false);
    setContent(null);
    setTitle(undefined);
  }, [pathname]);

  const api = useMemo<RightDrawerApi>(
    () => ({ open, close, isOpen, content, title, width }),
    [open, close, isOpen, content, title, width]
  );

  return (
    <RightDrawerContext.Provider value={api}>
      {children}
    </RightDrawerContext.Provider>
  );
}

export function useRightDrawer(): RightDrawerApi {
  const ctx = useContext(RightDrawerContext);
  if (!ctx) {
    throw new Error("useRightDrawer must be used within RightDrawerProvider");
  }
  return ctx;
}
