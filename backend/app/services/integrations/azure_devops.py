import httpx
import base64
from app.services.integrations.base import BasePMIntegration, ExportedIssue


class AzureDevOpsIntegration(BasePMIntegration):
    """
    credentials: {organization, personal_access_token}
    config:      {project, work_item_type}
    """

    def __init__(self, credentials: dict, config: dict):
        self._org = credentials["organization"]
        pat = credentials["personal_access_token"]
        encoded = base64.b64encode(f":{pat}".encode()).decode()
        self._headers = {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json-patch+json",
        }
        self._project = config["project"]
        self._work_item_type = config.get("work_item_type", "User Story")

    async def create_issue(self, story: dict) -> ExportedIssue:
        description = story.get("description", "")
        if story.get("acceptance_criteria"):
            description += f"<br><br><b>Acceptance Criteria</b><br>{story['acceptance_criteria']}"

        body = [
            {"op": "add", "path": "/fields/System.Title", "value": story["title"]},
            {"op": "add", "path": "/fields/System.Description", "value": description},
        ]
        if story.get("story_points") is not None:
            body.append({"op": "add", "path": "/fields/Microsoft.VSTS.Scheduling.StoryPoints", "value": story["story_points"]})

        url = f"https://dev.azure.com/{self._org}/{self._project}/_apis/wit/workitems/${self._work_item_type}?api-version=7.1"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=self._headers)
            response.raise_for_status()
            data = response.json()

        item_id = str(data["id"])
        web_url = data.get("_links", {}).get("html", {}).get("href", "")
        return ExportedIssue(external_id=item_id, external_url=web_url)
