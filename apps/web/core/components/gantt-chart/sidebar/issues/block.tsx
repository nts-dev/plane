/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import type { IGanttBlock } from "@plane/types";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
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
import { BLOCK_HEIGHT, GANTT_SELECT_GROUP } from "../../constants";

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
  const { updateActiveBlockId, isBlockActive, getNumberOfDaysFromPosition } = useTimeLineChartStore();
  const { getIsIssuePeeked } = useIssueDetail();

  const isBlockComplete = !!block?.start_date && !!block?.target_date;
  const duration = isBlockComplete ? getNumberOfDaysFromPosition(block?.position?.width) : undefined;

  if (!block?.data) return null;

  const isIssueSelected = selectionHelpers?.getIsEntitySelected(block.id);
  const isIssueFocused = selectionHelpers?.getIsEntityActive(block.id);
  const isBlockHoveredOn = isBlockActive(block.id);

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
        <div className="grid h-full min-w-0 flex-grow grid-cols-[minmax(240px,1fr)_120px_72px_72px_72px] items-center gap-3 truncate">
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
          <div className="flex-shrink-0 text-13 text-secondary">
            {duration ? (
              <span>
                {duration} day{duration > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-placeholder">--</span>
            )}
          </div>
        </div>
      </Row>
    </div>
  );
});
