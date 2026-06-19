/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import type { IGanttBlock } from "@plane/types";
import { Row } from "@plane/ui";
import { cn, findTotalDaysInRange, getDate, renderFormattedDate } from "@plane/utils";
// components
import { MultipleSelectEntityAction } from "@/components/core/multiple-select";
import {
  IssueGanttSidebarAssignees,
  IssueGanttSidebarBlock,
  IssueGanttSidebarTime,
} from "@/components/issues/issue-layouts/gantt/blocks";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { useTimeLineChartStore } from "@/hooks/use-timeline-chart";
// local imports
import { BLOCK_HEIGHT, GANTT_SELECT_GROUP, ISSUE_GANTT_SIDEBAR_GRID } from "../../constants";

type Props = {
  block: IGanttBlock;
  enableSelection: boolean;
  isDragging: boolean;
  selectionHelpers?: TSelectionHelper;
  isEpic?: boolean;
  depth?: number;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: (issueId: string) => void;
};

const getDateTime = (date: string | undefined | null, time: string | undefined | null): Date | undefined => {
  const parsedDate = getDate(date);
  if (!parsedDate) return;

  const [hours = "0", minutes = "0", seconds = "0"] = time?.split(":") ?? [];
  parsedDate.setHours(Number(hours), Number(minutes), Number(seconds), 0);

  return parsedDate;
};

const formatDurationInHours = (block: IGanttBlock): string | undefined => {
  const hasTimeRange = !!block.data?.start_time && !!block.data?.target_time;
  const startDateTime = hasTimeRange ? getDateTime(block.start_date, block.data?.start_time) : undefined;
  const targetDateTime = hasTimeRange ? getDateTime(block.target_date, block.data?.target_time) : undefined;

  if (startDateTime && targetDateTime) {
    const durationInMinutes = Math.max(0, Math.round((targetDateTime.getTime() - startDateTime.getTime()) / 60000));
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;

    if (hours === 0 && minutes === 0) return "0 hrs";
    if (minutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
    if (hours === 0) return `${minutes} min`;

    return `${hours}h ${minutes}m`;
  }

  const dateDuration = findTotalDaysInRange(block.start_date, block.target_date);
  if (!dateDuration) return;

  const hours = dateDuration * 24;
  return `${hours} hrs`;
};

export const IssuesSidebarBlock = observer(function IssuesSidebarBlock(props: Props) {
  const {
    block,
    enableSelection,
    isDragging,
    selectionHelpers,
    isEpic = false,
    depth = 0,
    hasChildren = false,
    isCollapsed = false,
    toggleCollapse,
  } = props;
  // store hooks
  const { updateActiveBlockId, isBlockActive } = useTimeLineChartStore();
  const { getIsIssuePeeked } = useIssueDetail();

  const duration = formatDurationInHours(block);

  if (!block?.data) return null;

  const isIssueSelected = selectionHelpers?.getIsEntitySelected(block.id);
  const isIssueFocused = selectionHelpers?.getIsEntityActive(block.id);
  const isBlockHoveredOn = isBlockActive(block.id);
  const dateLabel = renderFormattedDate(block.start_date ?? block.target_date) ?? "--";

  return (
    <div
      className={cn("group/list-block", {
        "rounded-sm bg-layer-1": isDragging,
        "rounded-l-sm border border-r-0 border-accent-strong": getIsIssuePeeked(block.data.id),
        "border border-r-0 border-strong-1": isIssueFocused,
      })}
      onMouseEnter={() => updateActiveBlockId(block.id)}
      onMouseLeave={() => updateActiveBlockId(null)}
    >
      <Row
        className={cn(
          "group flex w-full items-center gap-2 bg-layer-transparent pr-4 hover:bg-layer-transparent-hover",
          {
            "bg-layer-transparent-hover": isBlockHoveredOn,
            "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected,
            "bg-accent-primary/10": isIssueSelected && isBlockHoveredOn,
          }
        )}
        style={{
          height: `${BLOCK_HEIGHT}px`,
        }}
      >
        {enableSelection && selectionHelpers && (
          <div className="absolute left-1 flex items-center gap-2">
            <MultipleSelectEntityAction
              className={cn(
                "pointer-events-none opacity-0 transition-opacity group-hover/list-block:pointer-events-auto group-hover/list-block:opacity-100",
                {
                  "pointer-events-auto opacity-100": isIssueSelected,
                }
              )}
              groupId={GANTT_SELECT_GROUP}
              id={block.id}
              selectionHelpers={selectionHelpers}
            />
          </div>
        )}
        <div
          className="grid h-full min-w-0 flex-grow items-center gap-2 truncate"
          style={{ gridTemplateColumns: ISSUE_GANTT_SIDEBAR_GRID }}
        >
          <span className={cn("truncate text-13 text-secondary", { "text-placeholder": dateLabel === "--" })}>
            {dateLabel}
          </span>
          <IssueGanttSidebarBlock
            issueId={block.data.id}
            isEpic={isEpic}
            depth={depth}
            hasChildren={hasChildren}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
          />
          <IssueGanttSidebarAssignees issueId={block.data.id} />
          <IssueGanttSidebarTime value={block.data.start_time} />
          <IssueGanttSidebarTime value={block.data.target_time} />
          <div className="flex-shrink-0 truncate text-13 text-secondary">
            {duration ? <span>{duration}</span> : <span className="text-placeholder">--</span>}
          </div>
        </div>
      </Row>
    </div>
  );
});
