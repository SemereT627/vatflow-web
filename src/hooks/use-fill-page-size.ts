"use client";

import { useEffect, useRef, useState } from "react";

const ROW_HEIGHT_PX = 45;
const HEADER_HEIGHT_PX = 37;

/**
 * Sizes a page of table rows to fill the available height of its scroll
 * container, instead of always fetching a fixed row count. Without this,
 * a fixed page size leaves blank space below the table on tall viewports
 * (e.g. an external monitor) while looking fine on a laptop screen.
 */
export function useFillPageSize(defaultSize: number, minSize = defaultSize) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(defaultSize);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const available = el.clientHeight - HEADER_HEIGHT_PX;
      const rows = Math.floor(available / ROW_HEIGHT_PX);
      setPageSize(Math.max(minSize, rows));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minSize]);

  return { containerRef, pageSize };
}
