/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import { StartDatePropertyIcon } from "@plane/propel/icons";
// types
import type { TIssue } from "@plane/types";
// components
import { getDate, renderFormattedPayloadDate } from "@plane/utils";
import { DateDropdown } from "@/components/dropdowns/date";
import { WorkItemTimeInput } from "@/components/issues/work-item-time-input";
// helpers

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export const SpreadsheetStartDateColumn = observer(function SpreadsheetStartDateColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;

  return (
    <div className="h-11 border-b-[0.5px] border-subtle">
      <div className="flex h-full min-w-0 items-center gap-1 px-page-x">
        <DateDropdown
          value={issue.start_date}
          maxDate={getDate(issue.target_date)}
          onChange={(data) => {
            const startDate = data ? renderFormattedPayloadDate(data) : null;
            onChange(
              issue,
              { start_date: startDate },
              {
                changed_property: "start_date",
                change_details: startDate,
              }
            );
          }}
          disabled={disabled}
          placeholder="Start date"
          icon={<StartDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
          buttonVariant="transparent-with-text"
          buttonClassName="rounded-none text-left group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10"
          buttonContainerClassName="min-w-0 flex-1"
          optionsClassName="z-[9]"
          onClose={onClose}
        />
        <WorkItemTimeInput
          value={issue.start_time}
          onChange={(startTime) =>
            onChange(
              issue,
              { start_time: startTime },
              {
                changed_property: "start_time",
                change_details: startTime,
              }
            )
          }
          disabled={disabled}
          placeholder="Start time"
          className="h-7 w-24 min-w-0 shrink-0"
        />
      </div>
    </div>
  );
});
