/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cn } from "@plane/utils";

type TWorkItemTimeInputProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

const toInputTime = (value: string | null | undefined) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const toPayloadTime = (value: string) => {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
};

export function WorkItemTimeInput(props: TWorkItemTimeInputProps) {
  const { value, onChange, disabled = false, placeholder = "Time", className } = props;

  return (
    <input
      type="time"
      value={toInputTime(value)}
      onChange={(event) => onChange(toPayloadTime(event.target.value))}
      disabled={disabled}
      aria-label={placeholder}
      title={placeholder}
      className={cn(
        "h-7 min-w-20 rounded-sm border-[0.5px] border-strong bg-surface-1 px-2 text-caption-sm-regular text-primary outline-none hover:bg-layer-1 disabled:cursor-not-allowed disabled:opacity-60",
        !value && "text-placeholder",
        className
      )}
    />
  );
}
