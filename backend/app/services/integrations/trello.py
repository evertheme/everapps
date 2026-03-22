import httpx
from app.services.integrations.base import BasePMIntegration, ExportedIssue


class TrelloIntegration(BasePMIntegration):
    """
    credentials: {api_key, api_token}
    config:      {list_id}
    """

    BASE_URL = "https://api.trello.com/1"

    def __init__(self, credentials: dict, config: dict):
        self._api_key = credentials["api_key"]
        self._api_token = credentials["api_token"]
        self._list_id = config["list_id"]

    async def create_issue(self, story: dict) -> ExportedIssue:
        description = story.get("description", "")
        if story.get("acceptance_criteria"):
            description += f"\n\n**Acceptance Criteria**\n{story['acceptance_criteria']}"

        params = {
            "key": self._api_key,
            "token": self._api_token,
            "idList": self._list_id,
            "name": story["title"],
            "desc": description,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.BASE_URL}/cards", params=params)
            response.raise_for_status()
            data = response.json()
        return ExportedIssue(external_id=data["id"], external_url=data["url"])
