/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
// plane imports
import { Popover } from "@plane/propel/popover";
import { Tooltip } from "@plane/propel/tooltip";
import { ControlLink } from "@plane/ui";
import { cn, findTotalDaysInRange, generateWorkItemLink } from "@plane/utils";
// components
import { SIDEBAR_WIDTH } from "@/components/gantt-chart/constants";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web imports
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
import { IssueStats } from "@/plane-web/components/issues/issue-layouts/issue-stats";
// local imports
import { WorkItemPreviewCard } from "../../preview-card";
import { getBlockViewDetails } from "../utils";
import type { GanttStoreType } from "./base-gantt-root";

type Props = {
  issueId: string;
  isEpic?: boolean;
  depth?: number;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: (issueId: string) => void;
};

export const IssueGanttBlock = observer(function IssueGanttBlock(props: Props) {
  const { issueId, isEpic } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // store hooks
  const { getProjectStates } = useProjectState();
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  // hooks
  const { isMobile } = usePlatformOS();
  const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);

  // derived values
  const issueDetails = getIssueById(issueId);
  const stateDetails =
    issueDetails && getProjectStates(issueDetails?.project_id)?.find((state) => state?.id == issueDetails?.state_id);

  const { blockStyle } = getBlockViewDetails(issueDetails, stateDetails?.color ?? "");

  const handleIssuePeekOverview = () => handleRedirection(workspaceSlug, issueDetails, isMobile);

  const duration = findTotalDaysInRange(issueDetails?.start_date, issueDetails?.target_date) || 0;

  return (
    <Popover delay={100} openOnHover>
      <Popover.Button
        className="w-full"
        render={
          <button
            type="button"
            id={`issue-${issueId}`}
            className="space-between relative flex h-full w-full cursor-pointer items-center rounded-sm text-left"
            style={blockStyle}
            onClick={handleIssuePeekOverview}
          >
            <div className="absolute top-0 left-0 h-full w-full bg-surface-1/50" />
            <div
              className="sticky w-auto flex-1 truncate overflow-hidden px-2.5 py-1 text-13 text-primary"
              style={{ left: `${SIDEBAR_WIDTH}px` }}
            >
              {issueDetails?.name}
            </div>
            {isEpic && (
              <IssueStats
                issueId={issueId}
                className="sticky mx-2 w-auto flex-shrink-0 justify-end truncate overflow-hidden font-medium text-primary"
                showProgressText={duration >= 2}
              />
            )}
          </button>
        }
      />
      <Popover.Panel side="bottom" align="start">
        <>
          {issueDetails && issueDetails?.project_id && (
            <WorkItemPreviewCard
              projectId={issueDetails.project_id}
              stateDetails={{
                id: issueDetails.state_id ?? undefined,
              }}
              workItem={issueDetails}
            />
          )}
        </>
      </Popover.Panel>
    </Popover>
  );
});

// rendering issues on gantt sidebar
export const IssueGanttSidebarBlock = observer(function IssueGanttSidebarBlock(props: Props) {
  const { issueId, isEpic = false, depth = 0, hasChildren = false, isCollapsed = false, toggleCollapse } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // store hooks
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { isMobile } = usePlatformOS();
  const storeType = useIssueStoreType() as GanttStoreType;
  const { issuesFilter } = useIssues(storeType);
  const { getProjectIdentifierById } = useProject();

  // handlers
  const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);

  // derived values
  const issueDetails = getIssueById(issueId);
  const projectIdentifier = getProjectIdentifierById(issueDetails?.project_id);

  const handleIssuePeekOverview = (e: any) => {
    e.stopPropagation(true);
    e.preventDefault();
    handleRedirection(workspaceSlug, issueDetails, isMobile);
  };

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issueDetails?.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issueDetails?.sequence_id,
    isEpic,
  });

  return (
    <ControlLink
      id={`issue-${issueId}`}
      href={workItemLink}
      onClick={handleIssuePeekOverview}
      className="line-clamp-1 w-full cursor-pointer text-13 text-primary"
      disabled={!!issueDetails?.tempId}
    >
      <div
        className="relative flex h-full w-full cursor-pointer items-center gap-1.5"
        style={{ paddingLeft: depth * 18 }}
      >
        <button
          type="button"
          className={cn("grid size-5 flex-shrink-0 place-items-center rounded-sm text-placeholder", {
            "hover:bg-layer-transparent-hover hover:text-secondary": hasChildren,
            invisible: !hasChildren,
          })}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCollapse?.(issueId);
          }}
          aria-label={isCollapsed ? "Expand sub-work items" : "Collapse sub-work items"}
        >
          <ChevronRight
            className={cn("size-3 transition-transform", {
              "rotate-90": hasChildren && !isCollapsed,
            })}
          />
        </button>
        {issueDetails?.project_id && (
          <IssueIdentifier
            issueId={issueDetails.id}
            projectId={issueDetails.project_id}
            size="xs"
            variant="tertiary"
            displayProperties={issuesFilter?.issueFilters?.displayProperties}
          />
        )}
        <Tooltip tooltipContent={issueDetails?.name} isMobile={isMobile}>
          <span className="flex-grow truncate text-13 font-medium">{issueDetails?.name}</span>
        </Tooltip>
      </div>
    </ControlLink>
  );
});

export const IssueGanttSidebarAssignees = observer(function IssueGanttSidebarAssignees(props: { issueId: string }) {
  const { issueId } = props;
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { getUserDetails } = useMember();

  const issueDetails = getIssueById(issueId);
  const assigneeNames =
    issueDetails?.assignee_ids
      ?.map((assigneeId) => getUserDetails(assigneeId)?.display_name)
      .filter((displayName): displayName is string => !!displayName) ?? [];
  const label = assigneeNames.length > 0 ? assigneeNames.join(", ") : "--";

  return (
    <Tooltip tooltipContent={label}>
      <span className="truncate text-13 text-secondary">{label}</span>
    </Tooltip>
  );
});

export const IssueGanttSidebarTime = (props: { value?: string | null }) => {
  const { value } = props;
  const timeLabel = value ? value.slice(0, 5) : "--";

  return <span className="truncate text-13 text-secondary">{timeLabel}</span>;
};
