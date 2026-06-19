/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useRef, forwardRef } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
// plane imports
import { useOutsideClickDetector } from "@plane/hooks";
import { Popover } from "@plane/propel/popover";
import type { TIssue } from "@plane/types";
import { ControlLink } from "@plane/ui";
import { cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local components
import { WorkItemPreviewCard } from "../../preview-card";
import type { TRenderQuickActions } from "../list/list-view-types";

type Props = {
  issue: TIssue;
  quickActions: TRenderQuickActions;
  isDragging?: boolean;
  isEpic?: boolean;
};

export const CalendarIssueBlock = observer(
  forwardRef(function CalendarIssueBlock(props: Props, ref: React.ForwardedRef<HTMLAnchorElement>) {
    const { issue, quickActions, isDragging = false, isEpic = false } = props;
    // states
    const [isMenuActive, setIsMenuActive] = useState(false);
    // refs
    const blockRef = useRef(null);
    const menuActionRef = useRef<HTMLButtonElement | null>(null);
    // hooks
    const { workspaceSlug } = useParams();
    const { getProjectStates } = useProjectState();
    const { getIsIssuePeeked } = useIssueDetail();
    const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);
    const { isMobile } = usePlatformOS();
    const { getProjectIdentifierById } = useProject();
    const { getUserDetails } = useMember();

    const stateColor = getProjectStates(issue?.project_id)?.find((state) => state?.id == issue?.state_id)?.color || "";
    const projectIdentifier = getProjectIdentifierById(issue?.project_id);
    const assigneeNames =
      issue.assignee_ids
        ?.map((assigneeId) => getUserDetails(assigneeId)?.display_name)
        .filter((displayName): displayName is string => !!displayName) ?? [];
    const employeeLabel =
      assigneeNames.length > 0
        ? assigneeNames.map((displayName) => displayName.trim().split(/\s+/)[0]).join(", ")
        : "--";
    const startTimeLabel = issue.start_time ? issue.start_time.slice(0, 5) : "--";
    const targetTimeLabel = issue.target_time ? issue.target_time.slice(0, 5) : "--";
    const timeLabel = `${startTimeLabel} - ${targetTimeLabel}`;

    // handlers
    const handleIssuePeekOverview = (workItem: TIssue) =>
      handleRedirection(workspaceSlug.toString(), workItem, isMobile);

    useOutsideClickDetector(menuActionRef, () => setIsMenuActive(false));

    const customActionButton = (
      <button
        type="button"
        ref={menuActionRef}
        className={`w-full cursor-pointer rounded-sm p-1 text-placeholder hover:bg-layer-1 ${
          isMenuActive ? "bg-layer-1-active text-primary" : "text-secondary"
        }`}
        onClick={() => setIsMenuActive(!isMenuActive)}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    );

    const isMenuActionRefAboveScreenBottom =
      menuActionRef?.current && menuActionRef?.current?.getBoundingClientRect().bottom < window.innerHeight - 220;

    const placement = isMenuActionRefAboveScreenBottom ? "bottom-end" : "top-end";

    const workItemLink = generateWorkItemLink({
      workspaceSlug: workspaceSlug?.toString(),
      projectId: issue?.project_id,
      issueId: issue?.id,
      projectIdentifier,
      sequenceId: issue?.sequence_id,
      isEpic,
      isArchived: !!issue?.archived_at,
    });

    return (
      <Popover delay={100} openOnHover>
        <Popover.Button
          className="w-full"
          render={
            <ControlLink
              id={`issue-${issue.id}`}
              href={workItemLink}
              onClick={() => handleIssuePeekOverview(issue)}
              className="block w-full rounded-sm border-b border-subtle text-13 text-primary hover:border-subtle-1 md:border-[1px]"
              disabled={!!issue?.tempId || isMobile}
              ref={ref}
            >
              <>
                {issue?.tempId !== undefined && (
                  <div className="absolute top-0 left-0 z-[99999] h-full w-full animate-pulse bg-surface-1/20" />
                )}

                <div
                  ref={blockRef}
                  className={cn(
                    "group/calendar-block flex h-10 w-full items-center justify-between gap-1.5 rounded-sm px-4 py-1.5 md:h-8 md:px-1",
                    {
                      "border-accent-strong bg-surface-2 shadow-raised-200": isDragging,
                      "bg-surface-1 hover:bg-surface-2": !isDragging,
                      "border border-accent-strong hover:border-accent-strong": getIsIssuePeeked(issue.id),
                    }
                  )}
                >
                  <div className="grid h-full min-w-0 flex-grow grid-cols-[2px_72px_minmax(0,1fr)_78px] items-center gap-1.5 truncate">
                    <span
                      className="h-full w-0.5 rounded-sm"
                      style={{
                        backgroundColor: stateColor,
                      }}
                    />
                    <span className="truncate text-11 text-secondary">{employeeLabel}</span>
                    <span className="truncate text-13 font-medium md:text-11 md:font-regular">{issue.name}</span>
                    <span className="truncate text-11 text-secondary">{timeLabel}</span>
                  </div>
                  <div
                    role="presentation"
                    className={cn("size-5 flex-shrink-0", {
                      "hidden group-hover/calendar-block:block": !isMobile,
                      block: isMenuActive,
                    })}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {quickActions({
                      issue,
                      parentRef: blockRef,
                      customActionButton,
                      placement,
                    })}
                  </div>
                </div>
              </>
            </ControlLink>
          }
        />
        <Popover.Panel side="bottom" align="start">
          <>
            {issue.project_id && (
              <WorkItemPreviewCard
                projectId={issue.project_id}
                stateDetails={{
                  id: issue.state_id ?? undefined,
                }}
                workItem={issue}
              />
            )}
          </>
        </Popover.Panel>
      </Popover>
    );
  })
);

CalendarIssueBlock.displayName = "CalendarIssueBlock";
