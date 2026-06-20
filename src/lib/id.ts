export const createId = (prefix: string) =>
  `${prefix}_${(
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  ).slice(0, 8)}`;
