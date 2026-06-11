/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { CalendarDays } from "lucide-react";
// plane imports
import { DueDatePropertyIcon, StartDatePropertyIcon } from "@plane/propel/icons";
import type { TStateGroups } from "@plane/types";
import { cn, renderFormattedDate, shouldHighlightIssueDueDate } from "@plane/utils";

type Props = {
  startDate: string | null | undefined;
  startTime?: string | null;
  stateGroup: TStateGroups;
  targetDate: string | null | undefined;
  targetTime?: string | null;
};

const renderTime = (time: string | null | undefined) => (time ? ` ${time.slice(0, 5)}` : "");

export function WorkItemPreviewCardDate(props: Props) {
  const { startDate, startTime, stateGroup, targetDate, targetTime } = props;
  // derived values
  const isDateRangeEnabled = Boolean(startDate && targetDate);
  const shouldHighlightDate = shouldHighlightIssueDueDate(targetDate ?? null, stateGroup);

  if (!startDate && !targetDate) return null;

  return (
    <div className="h-full rounded-sm px-1 text-11 text-secondary">
      {isDateRangeEnabled ? (
        <div
          className={cn("flex h-full items-center gap-1", {
            "text-danger-primary": shouldHighlightDate,
          })}
        >
          <CalendarDays className="size-3 shrink-0" />
          <span>
            {renderFormattedDate(startDate)}
            {renderTime(startTime)} - {renderFormattedDate(targetDate)}
            {renderTime(targetTime)}
          </span>
        </div>
      ) : startDate ? (
        <div className="flex h-full items-center gap-1">
          <StartDatePropertyIcon className="size-3 shrink-0" />
          <span>
            {renderFormattedDate(startDate)}
            {renderTime(startTime)}
          </span>
        </div>
      ) : (
        <div
          className={cn("flex h-full items-center gap-1", {
            "text-danger-primary": shouldHighlightDate,
          })}
        >
          <DueDatePropertyIcon className="size-3 shrink-0" />
          <span>
            {renderFormattedDate(targetDate)}
            {renderTime(targetTime)}
          </span>
        </div>
      )}
    </div>
  );
}
