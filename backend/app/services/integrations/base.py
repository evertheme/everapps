from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ExportedIssue:
    external_id: str
    external_url: str


class BasePMIntegration(ABC):
    @abstractmethod
    async def create_issue(self, story: dict) -> ExportedIssue:
        """Create a ticket/issue in the PM tool from a story dict and return the result."""
        ...
