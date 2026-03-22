from app.services.integrations.base import BasePMIntegration, ExportedIssue


class JiraIntegration(BasePMIntegration):
    """
    credentials: {server, email, api_token}
    config:      {project_key, issue_type}
    """

    def __init__(self, credentials: dict, config: dict):
        from jira import JIRA
        self._client = JIRA(
            server=credentials["server"],
            basic_auth=(credentials["email"], credentials["api_token"]),
        )
        self._project_key = config.get("project_key", "")
        self._issue_type = config.get("issue_type", "Story")

    async def create_issue(self, story: dict) -> ExportedIssue:
        description = story.get("description", "")
        if story.get("acceptance_criteria"):
            description += f"\n\n*Acceptance Criteria:*\n{story['acceptance_criteria']}"

        priority_map = {
            "critical": "Highest",
            "high": "High",
            "medium": "Medium",
            "low": "Low",
        }

        fields = {
            "project": {"key": self._project_key},
            "summary": story["title"],
            "description": description,
            "issuetype": {"name": self._issue_type},
            "priority": {"name": priority_map.get(story.get("priority", "medium"), "Medium")},
        }
        if story.get("story_points") is not None:
            fields["story_points"] = story["story_points"]

        issue = self._client.create_issue(fields=fields)
        url = f"{self._client.server_url}/browse/{issue.key}"
        return ExportedIssue(external_id=issue.key, external_url=url)
