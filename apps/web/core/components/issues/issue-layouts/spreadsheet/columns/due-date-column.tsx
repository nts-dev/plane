/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
import { DueDatePropertyIcon } from "@plane/propel/icons";
// types
import type { TIssue } from "@plane/types";
import { cn, getDate, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
// components
import { DateDropdown } from "@/components/dropdowns/date";
import { WorkItemTimeInput } from "@/components/issues/work-item-time-input";
// helpers
// hooks
import { useProjectState } from "@/hooks/store/use-project-state";

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export const SpreadsheetDueDateColumn = observer(function SpreadsheetDueDateColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;
  // store hooks
  const { getStateById } = useProjectState();
  // derived values
  const stateDetails = getStateById(issue.state_id);

  return (
    <div className="h-11 border-b-[0.5px] border-subtle">
      <div className="flex h-full min-w-0 items-center gap-1 px-page-x">
        <DateDropdown
          value={issue.target_date}
          minDate={getDate(issue.start_date)}
          onChange={(data) => {
            const targetDate = data ? renderFormattedPayloadDate(data) : null;
            onChange(
              issue,
              { target_date: targetDate },
              {
                changed_property: "target_date",
                change_details: targetDate,
              }
            );
          }}
          disabled={disabled}
          placeholder="Due date"
          icon={<DueDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
          buttonVariant="transparent-with-text"
          buttonContainerClassName="min-w-0 flex-1"
          buttonClassName={cn(
            "rounded-none text-left group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10",
            {
              "text-danger-primary": shouldHighlightIssueDueDate(issue.target_date, stateDetails?.group),
            }
          )}
          optionsClassName="z-[9]"
          clearIconClassName="!text-primary"
          onClose={onClose}
        />
        <WorkItemTimeInput
          value={issue.target_time}
          onChange={(targetTime) =>
            onChange(
              issue,
              { target_time: targetTime },
              {
                changed_property: "target_time",
                change_details: targetTime,
              }
            )
          }
          disabled={disabled}
          placeholder="Due time"
          className="h-7 w-24 min-w-0 shrink-0"
        />
      </div>
    </div>
  );
});
