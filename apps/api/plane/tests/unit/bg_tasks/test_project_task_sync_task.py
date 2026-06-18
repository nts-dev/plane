# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from uuid import uuid4
from unittest.mock import patch

import pytest

from plane.bgtasks.project_task_sync_task import _build_project_task_payload, sync_project_task
from plane.db.models import Account, Issue, IssueAssignee, Project, User


def _create_external_user(contact_id):
    unique_id = uuid4().hex
    user = User.objects.create(email=f"user-{unique_id}@plane.so", username=f"user-{unique_id}")
    Account.objects.create(
        user=user,
        provider="external",
        provider_account_id=str(contact_id),
        access_token="",
    )
    return user


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_payload_uses_selected_assignee_external_contact_id():
    assignee = _create_external_user(contact_id=1234)

    payload = _build_project_task_payload(
        issue_data={"id": uuid4(), "name": "Task", "assignee_ids": [str(assignee.id)]},
        requested_data={},
        actor_id=str(uuid4()),
        actor_contact_id=9999,
    )

    assert payload["assignees"] == "1234"
    assert payload["enteredBy"] == 9999


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_payload_respects_explicit_empty_assignee_update():
    assignee = _create_external_user(contact_id=1234)

    payload = _build_project_task_payload(
        issue_data={"id": uuid4(), "name": "Task", "assignee_ids": [str(assignee.id)]},
        requested_data={"assignee_ids": []},
        actor_id=str(uuid4()),
        actor_contact_id=9999,
    )

    assert payload["assignees"] == ""


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_payload_maps_expanded_assignee_shape():
    assignee = _create_external_user(contact_id=1234)

    payload = _build_project_task_payload(
        issue_data={"id": uuid4(), "name": "Task", "assignees": [{"id": str(assignee.id)}]},
        requested_data={},
        actor_id=str(uuid4()),
        actor_contact_id=9999,
    )

    assert payload["assignees"] == "1234"


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_payload_uses_actor_contact_for_selected_actor_without_account(create_user):
    payload = _build_project_task_payload(
        issue_data={"id": uuid4(), "name": "Task", "assignee_ids": [str(create_user.id)]},
        requested_data={},
        actor_id=str(create_user.id),
        actor_contact_id=9999,
    )

    assert payload["assignees"] == "9999"


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_payload_uses_current_issue_assignee_when_update_does_not_change_assignee(workspace):
    assignee = _create_external_user(contact_id=1234)
    project = Project.objects.create(name="Test Project", identifier=f"TP{uuid4().hex[:4]}", workspace=workspace)
    issue = Issue.objects.create(
        name="Sub work item",
        workspace=workspace,
        project=project,
    )
    IssueAssignee.objects.create(
        issue=issue,
        assignee=assignee,
        workspace=workspace,
        project=project,
    )

    payload = _build_project_task_payload(
        issue_data={"id": str(issue.id), "name": "Sub work item"},
        requested_data={"description_html": "<p>Updated</p>"},
        actor_id=str(uuid4()),
        actor_contact_id=9999,
    )

    assert payload["assignees"] == "1234"


@pytest.mark.unit
@pytest.mark.django_db
def test_project_task_sync_skips_external_api_without_assignee(monkeypatch):
    monkeypatch.setenv("PROJECT_TASK_SYNC_ENABLED", "1")

    with patch("plane.bgtasks.project_task_sync_task._send_project_task_request") as mock_send:
        sync_project_task(
            issue_data={"id": str(uuid4()), "name": "Task", "assignee_ids": []},
            requested_data={},
            actor_id=str(uuid4()),
            actor_contact_id=9999,
        )

    mock_send.assert_not_called()
