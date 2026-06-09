# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import logging
import json
import os

import requests
from celery import shared_task
from django.utils import timezone

from plane.utils.exception_logger import log_exception


logger = logging.getLogger("plane.worker")


def _env_bool(key, default="0"):
    return os.environ.get(key, default).lower() in ["1", "true", "yes", "on"]


def _env_int(key):
    value = os.environ.get(key)
    if value in [None, ""]:
        return None

    try:
        return int(value)
    except ValueError:
        logger.warning("%s must be an integer; got %s", key, value)
        return None


def _join_ids(value):
    if not value:
        return ""
    if isinstance(value, list):
        return ",".join(str(item) for item in value)
    return str(value)


def _first_present(*values):
    for value in values:
        if value not in [None, ""]:
            return value
    return None


def _with_default_time(value, default_time):
    if not value:
        return f"{timezone.localdate().isoformat()} {default_time}"

    value = str(value)
    if "T" in value or " " in value:
        return value

    return f"{value} {default_time}"


def _contact_id(actor_contact_id):
    if actor_contact_id not in [None, ""]:
        try:
            return int(actor_contact_id)
        except (TypeError, ValueError):
            logger.warning("External contact id must be an integer; got %s", actor_contact_id)

    return _env_int("PROJECT_TASK_ENTERED_BY")


def _build_project_task_payload(issue_data, requested_data, actor_id, actor_contact_id=None):
    title = _first_present(requested_data.get("name"), issue_data.get("name"), "")
    description = _first_present(requested_data.get("description_html"), issue_data.get("description_html"), title)
    start_date = _first_present(requested_data.get("start_date"), issue_data.get("start_date"))
    due_date = _first_present(requested_data.get("target_date"), issue_data.get("target_date"))
    contact_id = _contact_id(actor_contact_id)

    return {
        "title": title,
        "description": description,
        "startDate": _with_default_time(start_date, "09:00:00"),
        "dueDate": _with_default_time(due_date, "17:00:00"),
        "priority": _first_present(requested_data.get("priority"), issue_data.get("priority"), "none"),
        "assignees": str(contact_id) if contact_id is not None else "",
        "projectId": _env_int("PROJECT_TASK_PROJECT_ID"),
        "workItemTypeId": _env_int("PROJECT_TASK_WORK_ITEM_TYPE_ID"),
        "planeWorkItemId": str(issue_data.get("id", "")),
        "enteredBy": contact_id,
        "completed": bool(issue_data.get("completed_at")),
        "visible": _env_bool("PROJECT_TASK_VISIBLE", "1"),
    }


@shared_task(bind=True, max_retries=3)
def sync_project_task(self, issue_data, requested_data, actor_id=None, actor_contact_id=None):
    if not _env_bool("PROJECT_TASK_SYNC_ENABLED", "0"):
        return

    url = os.environ.get("PROJECT_TASK_API_URL", "https://react.nts.nl/documents/api/v1/tasks")
    timeout = _env_int("PROJECT_TASK_API_TIMEOUT") or 10
    verify_ssl = _env_bool("PROJECT_TASK_API_VERIFY_SSL", "1")

    payload = _build_project_task_payload(
        issue_data=issue_data,
        requested_data=requested_data,
        actor_id=actor_id,
        actor_contact_id=actor_contact_id,
    )

    try:
        logger.info("PROJECT_TASK_SYNC_PAYLOAD %s", json.dumps(payload))
        logger.info("Posting Plane work item %s to project task API", payload["planeWorkItemId"])
        response = requests.post(url, json=payload, timeout=timeout, verify=verify_ssl)
        response.raise_for_status()
        logger.info("Synced Plane work item %s to project task API", payload["planeWorkItemId"])
    except requests.RequestException as exc:
        log_exception(exc, warning=True)
        raise self.retry(exc=exc, countdown=30)
