"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AssigneeOption {
  id: string;
  name: string;
}

export function AssigneeSelect({
  name,
  options,
  defaultValue,
  label = "Unassigned",
}: {
  name: string;
  options: AssigneeOption[];
  defaultValue?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "unassigned");

  return (
    <>
      <Select value={value} onValueChange={(v) => setValue(v ?? "unassigned")}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value === "unassigned" ? "" : value} />
    </>
  );
}
