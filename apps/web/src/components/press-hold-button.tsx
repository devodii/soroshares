"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOLD_DURATION_MS = 1200;

interface PressHoldButtonProps {
  onComplete: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PressHoldButton({
  onComplete,
  disabled,
  children,
  className,
}: PressHoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (!firedRef.current) {
          firedRef.current = true;
          onComplete();
        }
        cancel();
        return;
      }
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, [cancel, onComplete]);

  const start = useCallback(() => {
    if (disabled) return;
    firedRef.current = false;
    startRef.current = performance.now();
    setHolding(true);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [disabled]);

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        disabled={disabled}
        className="w-full select-none"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
      >
        {children}
      </Button>
      {holding && <Progress value={progress} />}
    </div>
  );
}
