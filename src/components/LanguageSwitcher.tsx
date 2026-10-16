import { LANGUAGES, type LanguageCode } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";

export function LanguageSwitcher({
  value,
  available,
  onChange,
}: {
  value: LanguageCode;
  available: LanguageCode[];
  onChange: (lang: LanguageCode) => void;
}) {
  const current = LANGUAGES.find((l) => l.code === value)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span>{current.flag}</span>
          <span>{current.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGES.map((l) => {
          const enabled = available.includes(l.code);
          return (
            <DropdownMenuItem
              key={l.code}
              disabled={!enabled}
              onClick={() => onChange(l.code)}
              className="flex items-center gap-2"
            >
              <span>{l.flag}</span>
              <span className="flex-1">{l.native}</span>
              {l.code === value && <Check className="h-4 w-4 text-primary" />}
              {!enabled && <span className="text-[10px] text-muted-foreground">soon</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
