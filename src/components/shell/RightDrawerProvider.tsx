"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Drawer } from "@mantine/core";

interface RightDrawerOpts {
  title?: string;
  width?: number;
}

export interface RightDrawerApi {
  open: (content: ReactNode, opts?: RightDrawerOpts) => void;
  close: () => void;
  isOpen: boolean;
}

const RightDrawerContext = createContext<RightDrawerApi | null>(null);

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

  const api = useMemo<RightDrawerApi>(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  return (
    <RightDrawerContext.Provider value={api}>
      {children}
      <Drawer
        opened={isOpen}
        onClose={close}
        position="right"
        withOverlay={false}
        size={width}
        title={title}
        keepMounted={false}
      >
        {content}
      </Drawer>
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
