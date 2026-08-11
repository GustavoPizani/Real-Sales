"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}

// Input de valor financeiro (reais inteiros) — mostra "7.981.491" enquanto digita
// e devolve o número puro (7981491) pro estado, sem exigir ponto/vírgula do usuário.
export function CurrencyInput({ value, onValueChange, className, ...props }: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    onValueChange(digitsOnly ? parseInt(digitsOnly, 10) : 0);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value ? value.toLocaleString("pt-BR") : ""}
      onChange={handleChange}
      className={cn(className)}
      placeholder="0"
      {...props}
    />
  );
}
