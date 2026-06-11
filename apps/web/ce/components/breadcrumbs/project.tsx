/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { ProjectIcon } from "@plane/propel/icons";
// plane imports
import type { ICustomSearchSelectOption } from "@plane/types";
import { BreadcrumbNavigationSearchDropdown, Breadcrumbs } from "@plane/ui";
import { SwitcherLabel } from "@/components/common/switcher-label";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useAppRouter } from "@/hooks/use-app-router";
import type { TProject } from "@/plane-web/types";
import { ProjectService } from "@/services/project";

type TProjectBreadcrumbProps = {
  workspaceSlug: string;
  projectId: string;
  handleOnClick?: () => void;
};

const projectService = new ProjectService();

const renderIcon = (projectDetails: TProject) => (
  <span className="grid size-4 flex-shrink-0 place-items-center">
    <Logo logo={projectDetails.logo_props} size={14} />
  </span>
);

export const ProjectBreadcrumb = observer(function ProjectBreadcrumb(props: TProjectBreadcrumbProps) {
  const { workspaceSlug, projectId, handleOnClick } = props;
  // router
  const router = useAppRouter();
  // store hooks
  const { joinedProjectIds, getPartialProjectById } = useProject();
  const currentProjectDetails = getPartialProjectById(projectId);

  // store hooks

  if (!currentProjectDetails) return null;

  // derived values
  const switcherOptions = joinedProjectIds
    .map((joinedProjectId) => {
      const project = getPartialProjectById(joinedProjectId);
      return {
        value: joinedProjectId,
        query: project?.name,
        content: (
          <SwitcherLabel
            name={project?.name}
            logo_props={project?.logo_props}
            LabelIcon={ProjectIcon}
            type="material"
          />
        ),
      };
    })
    .filter((option) => option !== undefined) as ICustomSearchSelectOption[];

  return (
    <>
      <Breadcrumbs.Item
        component={
          <BreadcrumbNavigationSearchDropdown
            selectedItem={currentProjectDetails.id}
            navigationItems={switcherOptions}
            onChange={async (value: string) => {
              const project = getPartialProjectById(value);
              const projectWorkspaceSlug = project?.workspace_detail?.slug ?? workspaceSlug;

              if (project && !project.member_role) {
                await projectService.ensureProjectReadOnlyAccess(workspaceSlug, project.id);
              }

              router.push(`/${projectWorkspaceSlug}/projects/${value}/issues`);
            }}
            title={currentProjectDetails?.name}
            icon={renderIcon(currentProjectDetails)}
            handleOnClick={() => {
              if (handleOnClick) handleOnClick();
              else {
                const projectWorkspaceSlug = currentProjectDetails.workspace_detail?.slug ?? workspaceSlug;
                router.push(`/${projectWorkspaceSlug}/projects/${currentProjectDetails.id}/issues/`);
              }
            }}
            shouldTruncate
          />
        }
        showSeparator={false}
      />
    </>
  );
});
