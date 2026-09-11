"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function isFullscreenActive() {
  const doc = document as FullscreenDocument;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleFullscreen(el?: HTMLElement | null) {
  const doc = document as FullscreenDocument;
  if (isFullscreenActive()) {
    await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    return;
  }
  const target = (el ?? document.documentElement) as FullscreenElement;
  await (target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.());
}

export function useFullscreen(ref?: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function sync() {
      setActive(isFullscreenActive());
    }
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    sync();
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    void toggleFullscreen(ref?.current).catch(() => undefined);
  }, [ref]);

  return { active, toggle };
}
