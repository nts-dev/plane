from datetime import time

from django.db import migrations


def backfill_issue_times(apps, schema_editor):
    Issue = apps.get_model("db", "Issue")
    DraftIssue = apps.get_model("db", "DraftIssue")
    IssueVersion = apps.get_model("db", "IssueVersion")

    for model in [Issue, DraftIssue, IssueVersion]:
        model._base_manager.filter(start_date__isnull=False, start_time__isnull=True).update(start_time=time(9, 0))
        model._base_manager.filter(target_date__isnull=False, target_time__isnull=True).update(target_time=time(17, 0))


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0122_issue_start_time_target_time"),
    ]

    operations = [
        migrations.RunPython(backfill_issue_times, migrations.RunPython.noop),
    ]
