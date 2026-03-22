from app.services.integrations.base import BasePMIntegration
from app.utils.security import decrypt
from app.models.integration import PMIntegration
import json


def get_integration(pm: PMIntegration) -> BasePMIntegration:
    creds_raw = pm.credentials_encrypted
    if creds_raw:
        credentials = json.loads(decrypt(creds_raw))
    else:
        credentials = {}

    config = pm.config or {}

    if pm.provider == "jira":
        from app.services.integrations.jira import JiraIntegration
        return JiraIntegration(credentials, config)
    elif pm.provider == "asana":
        from app.services.integrations.asana import AsanaIntegration
        return AsanaIntegration(credentials, config)
    elif pm.provider == "trello":
        from app.services.integrations.trello import TrelloIntegration
        return TrelloIntegration(credentials, config)
    elif pm.provider == "azure_devops":
        from app.services.integrations.azure_devops import AzureDevOpsIntegration
        return AzureDevOpsIntegration(credentials, config)
    else:
        raise ValueError(f"Unknown PM provider: {pm.provider}")
