"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function TagListInput({
  label,
  values,
  onChange,
  placeholder,
  helpText,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helpText?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div>
      <Label>{label}</Label>
      {helpText && <p className="mb-2 text-xs text-neutral-500">{helpText}</p>}
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((value, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-200"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-neutral-500 hover:text-white"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
