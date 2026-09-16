"use client";

import * as React from "react";
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
  const [progress, setProgress] = React.useState(0);
  const [holding, setHolding] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);
  const startRef = React.useRef<number>(0);
  const firedRef = React.useRef(false);

  const cancel = React.useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setHolding(false);
    setProgress(0);
  }, []);

  const tickRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
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

  const start = React.useCallback(() => {
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
