"use client";

import { useState, useEffect } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const COUNTRIES = [
  { code: "BR", flag: "🇧🇷", name: "Brasil",     ddi: "55"  },
  { code: "US", flag: "🇺🇸", name: "EUA",        ddi: "1"   },
  { code: "PT", flag: "🇵🇹", name: "Portugal",   ddi: "351" },
  { code: "AR", flag: "🇦🇷", name: "Argentina",  ddi: "54"  },
  { code: "CO", flag: "🇨🇴", name: "Colômbia",   ddi: "57"  },
  { code: "PY", flag: "🇵🇾", name: "Paraguai",   ddi: "595" },
  { code: "UY", flag: "🇺🇾", name: "Uruguai",    ddi: "598" },
  { code: "BO", flag: "🇧🇴", name: "Bolívia",    ddi: "591" },
  { code: "PE", flag: "🇵🇪", name: "Peru",       ddi: "51"  },
  { code: "CL", flag: "🇨🇱", name: "Chile",      ddi: "56"  },
  { code: "MX", flag: "🇲🇽", name: "México",     ddi: "52"  },
  { code: "ES", flag: "🇪🇸", name: "Espanha",    ddi: "34"  },
  { code: "GB", flag: "🇬🇧", name: "Reino Unido",ddi: "44"  },
  { code: "DE", flag: "🇩🇪", name: "Alemanha",   ddi: "49"  },
  { code: "IT", flag: "🇮🇹", name: "Itália",     ddi: "39"  },
  { code: "FR", flag: "🇫🇷", name: "França",     ddi: "33"  },
  { code: "JP", flag: "🇯🇵", name: "Japão",      ddi: "81"  },
  { code: "CN", flag: "🇨🇳", name: "China",      ddi: "86"  },
];

function parsePhone(value: string) {
  if (!value) return { ddi: "55", local: "" };
  const match = value.match(/^\+(\d+)\s(.*)$/);
  if (match) return { ddi: match[1], local: match[2] };
  return { ddi: "55", local: value };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [ddi, setDdi] = useState(parsed.ddi);
  const [local, setLocal] = useState(parsed.local);

  useEffect(() => {
    onChange(local ? `+${ddi} ${local}` : "");
  }, [ddi, local]);

  const country = COUNTRIES.find(c => c.ddi === ddi) ?? COUNTRIES[0];

  return (
    <div className="flex gap-1 items-center">
      <Select value={ddi} onValueChange={setDdi}>
        <SelectTrigger className="w-[100px] flex-shrink-0 px-2">
          <SelectValue>
            <span className="flex items-center gap-1 text-sm">
              <span>{country.flag}</span>
              <span className="text-muted-foreground">+{ddi}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {COUNTRIES.map(c => (
            <SelectItem key={c.code} value={c.ddi}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground text-xs">+{c.ddi}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={local}
        onChange={e => setLocal(e.target.value.replace(/[^\d\s\-()]/g, ""))}
        placeholder={placeholder ?? "(11) 99999-9999"}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
