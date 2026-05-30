"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface Props {
  trigger: boolean;
  milestone?: boolean;
}

export function ConfettiEffect({ trigger, milestone = false }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (!trigger || fired.current) return;
    fired.current = true;

    if (milestone) {
      // Big celebration for milestones
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ["#7c3aed", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else {
      // Simple completion confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7c3aed", "#a855f7", "#ec4899", "#f59e0b"],
        gravity: 1.2,
      });
    }
  }, [trigger, milestone]);

  return null;
}
