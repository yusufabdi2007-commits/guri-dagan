"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DIAL_CODES, splitPhone } from "@/lib/dial-codes";

interface PhoneInputProps {
  /** Full phone number including dial code, e.g. "+252 61 234 5678". */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Phone/WhatsApp input that forces a country-code choice instead of a free-typed
 * number — every registration flow must record which country the number belongs to.
 */
export function PhoneInput({ value, onChange, id, required, className, placeholder }: PhoneInputProps) {
  const initial = splitPhone(value);
  const [dial, setDial] = useState(initial.dial);
  const [number, setNumber] = useState(initial.number);

  function emit(nextDial: string, nextNumber: string) {
    onChange(nextNumber ? `${nextDial} ${nextNumber}`.trim() : "");
  }

  return (
    <div className="flex gap-2">
      <select
        aria-label="Country code"
        value={dial}
        onChange={(e) => {
          setDial(e.target.value);
          emit(e.target.value, number);
        }}
        className={cn(
          "h-11 w-[92px] shrink-0 rounded-xl border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {DIAL_CODES.map((c) => (
          <option key={c.name} value={c.dial}>
            {c.dial} {c.name}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        required={required}
        value={number}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d\s-]/g, "");
          setNumber(cleaned);
          emit(dial, cleaned);
        }}
        placeholder={placeholder ?? "e.g. 61 234 5678"}
        className={cn(
          "flex h-11 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className
        )}
      />
    </div>
  );
}
