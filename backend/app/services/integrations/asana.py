import httpx
from app.services.integrations.base import BasePMIntegration, ExportedIssue


class AsanaIntegration(BasePMIntegration):
    """
    credentials: {access_token}
    config:      {project_gid}
    """

    BASE_URL = "https://app.asana.com/api/1.0"

    def __init__(self, credentials: dict, config: dict):
        self._token = credentials["access_token"]
        self._project_gid = config["project_gid"]

    async def create_issue(self, story: dict) -> ExportedIssue:
        notes = story.get("description", "")
        if story.get("acceptance_criteria"):
            notes += f"\n\nAcceptance Criteria:\n{story['acceptance_criteria']}"

        payload = {
            "data": {
                "name": story["title"],
                "notes": notes,
                "projects": [self._project_gid],
            }
        }
        headers = {"Authorization": f"Bearer {self._token}", "Accept": "application/json"}
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.BASE_URL}/tasks", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()["data"]
        gid = data["gid"]
        return ExportedIssue(
            external_id=gid,
            external_url=f"https://app.asana.com/0/{self._project_gid}/{gid}",
        )
