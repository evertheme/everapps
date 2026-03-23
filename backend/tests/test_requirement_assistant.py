"""
Tests for the Requirements Document Assistant — Phase 1 & 2.

Phase 1 covers:
- RequirementTemplateService unit tests
- gap_analysis_service unit tests (with mocked LLM)
- API endpoint integration tests (gap analysis run + report)

Phase 2 covers:
- draft_gap_fill service unit tests
- approve_section service unit tests
- save_gap_fill_document service unit tests
- API endpoint integration tests (fill, approve, save-document)
"""
import io
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.requirement_template_service import RequirementTemplateService, requirement_template_service


# ── RequirementTemplateService unit tests ────────────────────────────────────

class TestRequirementTemplateService:
    def test_get_taxonomy_returns_12_sections(self):
        taxonomy = requirement_template_service.get_taxonomy()
        assert len(taxonomy) == 12

    def test_sections_ordered_by_order_field(self):
        taxonomy = requirement_template_service.get_taxonomy()
        orders = [s.order for s in taxonomy]
        assert orders == list(range(1, 13))

    def test_required_sections_count(self):
        required = requirement_template_service.get_required_sections()
        # document_header, executive_summary, project_context, scope,
        # stakeholders, functional_requirements, non_functional_requirements = 7
        assert len(required) == 7
        for s in required:
            assert s.is_required

    def test_get_section_by_type(self):
        section = requirement_template_service.get_section("functional_requirements")
        assert section.display_name == "Functional Requirements"
        assert section.required_level == "required"

    def test_get_section_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown section_type"):
            requirement_template_service.get_section("nonexistent_section")

    def test_compute_overall_score_all_present(self):
        # All sections at 100 → overall should be 100
        section_scores = {
            s.section_type: 100
            for s in requirement_template_service.get_taxonomy()
        }
        score = requirement_template_service.compute_overall_score(section_scores)
        assert score == 100

    def test_compute_overall_score_all_missing(self):
        score = requirement_template_service.compute_overall_score({})
        assert score == 0

    def test_compute_overall_score_partial(self):
        # Only required sections at 100, recommended/optional at 0
        section_scores = {
            s.section_type: 100 if s.is_required else 0
            for s in requirement_template_service.get_taxonomy()
        }
        score = requirement_template_service.compute_overall_score(section_scores)
        # Required sections are weighted 2×, recommended 1×, optional 0×
        # 7 required × 2 × 100 = 1400
        # 4 recommended × 1 × 0 = 0
        # total_weight = 7×2 + 4×1 = 18
        # score = 1400 / 18 ≈ 77.8 → rounds to 78
        assert 70 <= score <= 85

    def test_optional_section_not_in_score(self):
        # timeline is optional — boosting it should not change the score
        base_scores = {s.section_type: 50 for s in requirement_template_service.get_taxonomy()}
        score_without = requirement_template_service.compute_overall_score(base_scores)
        base_scores["timeline"] = 100
        score_with = requirement_template_service.compute_overall_score(base_scores)
        assert score_without == score_with

    def test_all_section_types_unique(self):
        taxonomy = requirement_template_service.get_taxonomy()
        types = [s.section_type for s in taxonomy]
        assert len(types) == len(set(types))

    def test_scoring_sections_excludes_optional(self):
        scoring = requirement_template_service.get_scoring_sections()
        for s in scoring:
            assert s.required_level != "optional"


# ── gap_analysis_service unit tests ─────────────────────────────────────────

MINIMAL_LLM_RESPONSE = {
    "sections": {
        "document_header": {"content": "Project Alpha v1.0", "score": 80, "gap_status": "present", "feedback": "Good"},
        "executive_summary": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "project_context": {"content": "Business problem: ...", "score": 45, "gap_status": "thin", "feedback": "Missing objectives"},
        "scope": {"content": "In scope: ...", "score": 70, "gap_status": "present", "feedback": ""},
        "stakeholders": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "functional_requirements": {"content": "FR-001: ...", "score": 75, "gap_status": "present", "feedback": ""},
        "non_functional_requirements": {"content": "Performance: ...", "score": 30, "gap_status": "thin", "feedback": "Missing security"},
        "data_requirements": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "constraints": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "success_metrics": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "timeline": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
        "glossary": {"content": "", "score": 0, "gap_status": "missing", "feedback": "Not found"},
    }
}


class TestGapAnalysisService:
    """Tests gap_analysis_service functions with a mocked LLM provider."""

    @pytest.fixture
    def mock_provider(self):
        provider = AsyncMock()
        provider.complete = AsyncMock(return_value=json.dumps(MINIMAL_LLM_RESPONSE))
        return provider

    @pytest.mark.asyncio
    async def test_run_gap_analysis_creates_session(self, mock_provider, db_session, test_user):
        from app.models.project import Project
        from app.models.document import RequirementDocument, DocumentVersion
        from app.services.gap_analysis_service import run_gap_analysis

        project = Project(
            id=uuid.uuid4(), user_id=test_user.id, name="Test Project"
        )
        db_session.add(project)
        db_session.flush()

        doc = RequirementDocument(
            id=uuid.uuid4(),
            project_id=project.id,
            created_by=test_user.id,
            filename="spec.md",
            file_type="md",
        )
        db_session.add(doc)
        db_session.flush()

        version = DocumentVersion(
            id=uuid.uuid4(),
            document_id=doc.id,
            created_by=test_user.id,
            version_number=1,
            content="# Project Alpha\n\nThis is a requirements document.",
        )
        db_session.add(version)
        db_session.commit()

        session = await run_gap_analysis(
            document_text=version.content,
            document_version_id=version.id,
            project_id=project.id,
            document_id=doc.id,
            provider=mock_provider,
            db=db_session,
        )

        assert session.mode == "gap_analysis"
        assert session.status == "complete"
        assert 0 <= session.completeness_score <= 100

    @pytest.mark.asyncio
    async def test_run_gap_analysis_creates_12_sections(self, mock_provider, db_session, test_user):
        from app.models.project import Project
        from app.models.document import RequirementDocument, DocumentVersion
        from app.models.requirement_section import RequirementSection
        from app.services.gap_analysis_service import run_gap_analysis

        project = Project(id=uuid.uuid4(), user_id=test_user.id, name="P")
        db_session.add(project)
        doc = RequirementDocument(
            id=uuid.uuid4(), project_id=project.id,
            created_by=test_user.id, filename="r.md", file_type="md",
        )
        db_session.add(doc)
        db_session.flush()
        version = DocumentVersion(
            id=uuid.uuid4(), document_id=doc.id,
            created_by=test_user.id, version_number=1, content="content",
        )
        db_session.add(version)
        db_session.commit()

        session = await run_gap_analysis(
            document_text=version.content,
            document_version_id=version.id,
            project_id=project.id,
            document_id=doc.id,
            provider=mock_provider,
            db=db_session,
        )

        sections = (
            db_session.query(RequirementSection)
            .filter(RequirementSection.session_id == session.id)
            .all()
        )
        assert len(sections) == 12

    @pytest.mark.asyncio
    async def test_run_gap_analysis_abandons_prior_session(self, mock_provider, db_session, test_user):
        from app.models.project import Project
        from app.models.document import RequirementDocument, DocumentVersion
        from app.models.requirement_session import RequirementSession
        from app.services.gap_analysis_service import run_gap_analysis

        project = Project(id=uuid.uuid4(), user_id=test_user.id, name="P")
        db_session.add(project)
        doc = RequirementDocument(
            id=uuid.uuid4(), project_id=project.id,
            created_by=test_user.id, filename="r.md", file_type="md",
        )
        db_session.add(doc)
        db_session.flush()
        version = DocumentVersion(
            id=uuid.uuid4(), document_id=doc.id,
            created_by=test_user.id, version_number=1, content="content",
        )
        db_session.add(version)
        db_session.commit()

        # Run twice
        await run_gap_analysis(
            document_text=version.content,
            document_version_id=version.id,
            project_id=project.id,
            document_id=doc.id,
            provider=mock_provider,
            db=db_session,
        )
        await run_gap_analysis(
            document_text=version.content,
            document_version_id=version.id,
            project_id=project.id,
            document_id=doc.id,
            provider=mock_provider,
            db=db_session,
        )

        sessions = (
            db_session.query(RequirementSession)
            .filter(
                RequirementSession.project_id == project.id,
                RequirementSession.mode == "gap_analysis",
            )
            .all()
        )
        statuses = {s.status for s in sessions}
        # Exactly one complete, others abandoned
        assert statuses == {"complete", "abandoned"} or statuses == {"complete"}
        complete_count = sum(1 for s in sessions if s.status == "complete")
        assert complete_count == 1

    @pytest.mark.asyncio
    async def test_gap_status_derived_from_score(self, mock_provider, db_session, test_user):
        from app.models.project import Project
        from app.models.document import RequirementDocument, DocumentVersion
        from app.models.requirement_section import RequirementSection
        from app.services.gap_analysis_service import run_gap_analysis

        project = Project(id=uuid.uuid4(), user_id=test_user.id, name="P")
        db_session.add(project)
        doc = RequirementDocument(
            id=uuid.uuid4(), project_id=project.id,
            created_by=test_user.id, filename="r.md", file_type="md",
        )
        db_session.add(doc)
        db_session.flush()
        version = DocumentVersion(
            id=uuid.uuid4(), document_id=doc.id,
            created_by=test_user.id, version_number=1, content="content",
        )
        db_session.add(version)
        db_session.commit()

        session = await run_gap_analysis(
            document_text=version.content,
            document_version_id=version.id,
            project_id=project.id,
            document_id=doc.id,
            provider=mock_provider,
            db=db_session,
        )

        sections = {
            s.section_type: s
            for s in db_session.query(RequirementSection)
            .filter(RequirementSection.session_id == session.id)
            .all()
        }
        # document_header has score=80 → status=complete
        assert sections["document_header"].completeness_score == 80
        # executive_summary has score=0 → status=pending
        assert sections["executive_summary"].completeness_score == 0
        assert sections["executive_summary"].status == "pending"


# ── API integration tests ────────────────────────────────────────────────────

class TestGapAnalysisEndpoints:
    """Integration tests for /api/v1/req-assistant endpoints."""

    def _upload_doc(self, auth_client, project_id: str, content: bytes = b"# Spec\n\nRequirements.") -> str:
        res = auth_client.post(
            f"/api/v1/documents/{project_id}/upload",
            files={"file": ("spec.md", io.BytesIO(content), "text/plain")},
        )
        assert res.status_code == 201
        return res.json()["id"]

    def test_get_taxonomy(self, auth_client, test_project):
        res = auth_client.get(f"/api/v1/req-assistant/{test_project['id']}/taxonomy")
        assert res.status_code == 200
        taxonomy = res.json()
        assert len(taxonomy) == 12
        types = [s["section_type"] for s in taxonomy]
        assert "functional_requirements" in types
        assert "document_header" in types

    def test_get_taxonomy_requires_auth(self, client, test_project):
        res = client.get(f"/api/v1/req-assistant/{test_project['id']}/taxonomy")
        assert res.status_code == 403

    def test_get_taxonomy_wrong_project(self, auth_client):
        res = auth_client.get(f"/api/v1/req-assistant/00000000-0000-0000-0000-000000000000/taxonomy")
        assert res.status_code == 404

    def test_run_gap_analysis(self, auth_client, test_project):
        project_id = test_project["id"]
        doc_id = self._upload_doc(auth_client, project_id)

        with patch(
            "app.services.gap_analysis_service._single_pass_analysis",
            new_callable=AsyncMock,
            return_value=MINIMAL_LLM_RESPONSE,
        ):
            res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis",
                json={"document_id": doc_id},
            )

        assert res.status_code == 201
        data = res.json()
        assert data["document_id"] == doc_id
        assert len(data["sections"]) == 12
        assert 0 <= data["overall_score"] <= 100

    def test_run_gap_analysis_wrong_document(self, auth_client, test_project):
        res = auth_client.post(
            f"/api/v1/req-assistant/{test_project['id']}/gap-analysis",
            json={"document_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert res.status_code == 404

    def test_get_report_not_found(self, auth_client, test_project):
        res = auth_client.get(
            f"/api/v1/req-assistant/{test_project['id']}/gap-analysis/report"
        )
        assert res.status_code == 404

    def test_get_report_after_analysis(self, auth_client, test_project, db_session):
        project_id = test_project["id"]
        doc_id = self._upload_doc(auth_client, project_id)

        with patch(
            "app.services.gap_analysis_service._single_pass_analysis",
            new_callable=AsyncMock,
            return_value=MINIMAL_LLM_RESPONSE,
        ):
            run_res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis",
                json={"document_id": doc_id},
            )
        assert run_res.status_code == 201

        # Now retrieve the report
        report_res = auth_client.get(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/report"
        )
        assert report_res.status_code == 200
        report = report_res.json()
        assert report["document_id"] == doc_id
        assert len(report["sections"]) == 12

    def test_gap_analysis_requires_auth(self, client, test_project):
        res = client.post(
            f"/api/v1/req-assistant/{test_project['id']}/gap-analysis",
            json={"document_id": str(uuid.uuid4())},
        )
        assert res.status_code == 403

    def test_section_gap_statuses_in_report(self, auth_client, test_project):
        project_id = test_project["id"]
        doc_id = self._upload_doc(auth_client, project_id)

        with patch(
            "app.services.gap_analysis_service._single_pass_analysis",
            new_callable=AsyncMock,
            return_value=MINIMAL_LLM_RESPONSE,
        ):
            run_res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis",
                json={"document_id": doc_id},
            )
        assert run_res.status_code == 201
        sections = {s["section_type"]: s for s in run_res.json()["sections"]}

        assert sections["document_header"]["gap_status"] == "present"
        assert sections["document_header"]["completeness_score"] == 80
        assert sections["executive_summary"]["gap_status"] == "missing"
        assert sections["executive_summary"]["completeness_score"] == 0
        assert sections["project_context"]["gap_status"] == "thin"
        assert sections["project_context"]["completeness_score"] == 45

    def test_report_includes_status_and_can_save(self, auth_client, test_project):
        """Phase 2: report response must include status per section and can_save flag."""
        project_id = test_project["id"]
        doc_id = self._upload_doc(auth_client, project_id)

        with patch(
            "app.services.gap_analysis_service._single_pass_analysis",
            new_callable=AsyncMock,
            return_value=MINIMAL_LLM_RESPONSE,
        ):
            res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis",
                json={"document_id": doc_id},
            )
        assert res.status_code == 201
        data = res.json()

        # can_save should be in the response
        assert "can_save" in data
        # document_header is present (score 80), executive_summary is missing (score 0)
        # → executive_summary not complete → can_save must be False
        assert data["can_save"] is False

        # Each section must have a status field
        for section in data["sections"]:
            assert "status" in section
        sections = {s["section_type"]: s for s in data["sections"]}
        assert sections["document_header"]["status"] == "complete"
        assert sections["executive_summary"]["status"] == "pending"


# ── Phase 2 service unit tests ───────────────────────────────────────────────

class TestGapFillService:
    """Unit tests for the Phase 2 service functions."""

    def _setup_session_with_sections(self, db_session, test_user):
        """Helper: create a project, doc, version, session, and 12 sections."""
        from app.models.project import Project
        from app.models.document import RequirementDocument, DocumentVersion
        from app.models.requirement_section import RequirementSection
        from app.models.requirement_session import RequirementSession

        project = Project(id=uuid.uuid4(), user_id=test_user.id, name="GP")
        db_session.add(project)
        doc = RequirementDocument(
            id=uuid.uuid4(), project_id=project.id,
            created_by=test_user.id, filename="r.md", file_type="md",
        )
        db_session.add(doc)
        db_session.flush()
        version = DocumentVersion(
            id=uuid.uuid4(), document_id=doc.id,
            created_by=test_user.id, version_number=1, content="content",
        )
        db_session.add(version)
        db_session.flush()

        session = RequirementSession(
            id=uuid.uuid4(),
            project_id=project.id,
            document_id=doc.id,
            mode="gap_analysis",
            status="complete",
        )
        db_session.add(session)
        db_session.flush()

        # Add all 12 sections; document_header is "present", the rest pending
        from app.services.requirement_template_service import requirement_template_service
        for tmpl in requirement_template_service.get_taxonomy():
            is_header = tmpl.section_type == "document_header"
            sec = RequirementSection(
                session_id=session.id,
                document_version_id=version.id,
                section_type=tmpl.section_type,
                content="Project Alpha" if is_header else "",
                source="imported",
                status="complete" if is_header else "pending",
                completeness_score=80 if is_header else 0,
                is_ai_generated=False,
            )
            db_session.add(sec)
        db_session.commit()

        return project, doc, version, session

    @pytest.mark.asyncio
    async def test_draft_gap_fill_updates_section(self, db_session, test_user):
        from app.services.gap_analysis_service import draft_gap_fill

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)

        mock_provider = AsyncMock()
        mock_provider.complete = AsyncMock(return_value="Drafted executive summary content.")

        section = await draft_gap_fill(
            session_id=session.id,
            section_type="executive_summary",
            provider=mock_provider,
            db=db_session,
        )

        assert section.content == "Drafted executive summary content."
        assert section.source == "ai_gap_fill"
        assert section.status == "in_progress"
        assert section.is_ai_generated is True

    @pytest.mark.asyncio
    async def test_draft_gap_fill_includes_context_in_prompt(self, db_session, test_user):
        from app.services.gap_analysis_service import draft_gap_fill

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)

        mock_provider = AsyncMock()
        mock_provider.complete = AsyncMock(return_value="Draft.")

        await draft_gap_fill(
            session_id=session.id,
            section_type="executive_summary",
            provider=mock_provider,
            db=db_session,
        )

        # The user_prompt passed to complete() should include the existing header content
        call_args = mock_provider.complete.call_args
        user_prompt = call_args[0][1]
        assert "Project Alpha" in user_prompt

    @pytest.mark.asyncio
    async def test_draft_gap_fill_invalid_session_raises(self, db_session, test_user):
        from app.services.gap_analysis_service import draft_gap_fill

        mock_provider = AsyncMock()
        mock_provider.complete = AsyncMock(return_value="Draft.")

        with pytest.raises(ValueError, match="not found"):
            await draft_gap_fill(
                session_id=uuid.uuid4(),
                section_type="executive_summary",
                provider=mock_provider,
                db=db_session,
            )

    def test_approve_section_marks_complete(self, db_session, test_user):
        from app.services.gap_analysis_service import approve_section

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)

        section = approve_section(
            session_id=session.id,
            section_type="executive_summary",
            content="Our product solves X for Y.",
            db=db_session,
        )

        assert section.status == "complete"
        assert section.content == "Our product solves X for Y."
        assert section.completeness_score == 75
        assert section.approved_at is not None

    def test_approve_section_recomputes_session_score(self, db_session, test_user):
        from app.services.gap_analysis_service import approve_section
        from app.models.requirement_session import RequirementSession

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)
        score_before = session.completeness_score

        approve_section(
            session_id=session.id,
            section_type="executive_summary",
            content="Executive summary content.",
            db=db_session,
        )

        db_session.refresh(session)
        assert session.completeness_score != score_before or score_before == 100

    def test_approve_section_missing_section_raises(self, db_session, test_user):
        from app.services.gap_analysis_service import approve_section
        from app.models.requirement_session import RequirementSession

        # Session with no sections
        from app.models.project import Project
        project = Project(id=uuid.uuid4(), user_id=test_user.id, name="P")
        db_session.add(project)
        from app.models.document import RequirementDocument
        doc = RequirementDocument(
            id=uuid.uuid4(), project_id=project.id,
            created_by=test_user.id, filename="r.md", file_type="md",
        )
        db_session.add(doc)
        db_session.flush()
        session = RequirementSession(
            id=uuid.uuid4(), project_id=project.id,
            document_id=doc.id, mode="gap_analysis", status="complete",
        )
        db_session.add(session)
        db_session.commit()

        with pytest.raises(ValueError, match="not found"):
            approve_section(
                session_id=session.id,
                section_type="executive_summary",
                content="Content.",
                db=db_session,
            )

    def test_save_gap_fill_document_creates_new_version(self, db_session, test_user):
        from app.services.gap_analysis_service import approve_section, save_gap_fill_document
        from app.models.document import RequirementDocument

        _, doc, _, session = self._setup_session_with_sections(db_session, test_user)

        # Approve executive_summary so both required sections are complete
        approve_section(
            session_id=session.id,
            section_type="executive_summary",
            content="Executive summary.",
            db=db_session,
        )

        new_version = save_gap_fill_document(
            session_id=session.id,
            user_id=test_user.id,
            db=db_session,
        )

        assert new_version.version_number == 2
        assert new_version.document_id == doc.id
        assert "Requirements Document" in new_version.content

        db_session.refresh(doc)
        assert doc.current_version == 2

    def test_save_gap_fill_document_includes_approved_sections(self, db_session, test_user):
        from app.services.gap_analysis_service import approve_section, save_gap_fill_document

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)

        approve_section(
            session_id=session.id,
            section_type="executive_summary",
            content="We build tools for teams.",
            db=db_session,
        )

        new_version = save_gap_fill_document(
            session_id=session.id,
            user_id=test_user.id,
            db=db_session,
        )

        assert "We build tools for teams." in new_version.content
        assert "Project Alpha" in new_version.content  # document_header content

    def test_save_gap_fill_document_missing_required_raises(self, db_session, test_user):
        from app.services.gap_analysis_service import save_gap_fill_document

        _, _, _, session = self._setup_session_with_sections(db_session, test_user)
        # executive_summary is still pending → should fail

        with pytest.raises(ValueError, match="executive_summary"):
            save_gap_fill_document(
                session_id=session.id,
                user_id=test_user.id,
                db=db_session,
            )


# ── Phase 2 API endpoint integration tests ───────────────────────────────────

class TestGapFillEndpoints:
    """Integration tests for Phase 2 interactive gap fill endpoints."""

    def _setup_analysis(self, auth_client, project_id: str) -> str:
        """Upload a doc, run gap analysis, return the doc_id."""
        res = auth_client.post(
            f"/api/v1/documents/{project_id}/upload",
            files={"file": ("spec.md", io.BytesIO(b"# Spec\n\nContent."), "text/plain")},
        )
        assert res.status_code == 201
        doc_id = res.json()["id"]

        with patch(
            "app.services.gap_analysis_service._single_pass_analysis",
            new_callable=AsyncMock,
            return_value=MINIMAL_LLM_RESPONSE,
        ):
            ga_res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis",
                json={"document_id": doc_id},
            )
        assert ga_res.status_code == 201
        return doc_id

    def test_fill_section_returns_draft(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)

        # Patch where the router imported the function from
        with patch(
            "app.routers.requirement_assistant.draft_gap_fill",
            new_callable=AsyncMock,
        ) as mock_fill:
            from app.models.requirement_section import RequirementSection
            import uuid as _uuid
            mock_section = RequirementSection(
                id=_uuid.uuid4(),
                session_id=_uuid.uuid4(),
                section_type="executive_summary",
                content="AI-drafted executive summary.",
                source="ai_gap_fill",
                status="in_progress",
                completeness_score=0,
                is_ai_generated=True,
                ai_feedback=None,
            )
            mock_fill.return_value = mock_section

            res = auth_client.post(
                f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/fill"
            )

        assert res.status_code == 200
        data = res.json()
        assert data["section_type"] == "executive_summary"
        assert data["content"] == "AI-drafted executive summary."

    def test_fill_section_invalid_type_returns_422(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)

        res = auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/nonexistent_section/fill"
        )
        assert res.status_code == 422

    def test_fill_section_no_session_returns_404(self, auth_client, test_project):
        project_id = test_project["id"]
        # No gap analysis run → no session
        res = auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/fill"
        )
        assert res.status_code == 404

    def test_approve_section_returns_complete_status(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)

        res = auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/approve",
            json={"content": "We build tools for engineering teams."},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "complete"
        assert data["gap_status"] == "present"
        assert data["content"] == "We build tools for engineering teams."

    def test_approve_section_requires_auth(self, client, test_project):
        res = client.post(
            f"/api/v1/req-assistant/{test_project['id']}/gap-analysis/section/executive_summary/approve",
            json={"content": "Content."},
        )
        assert res.status_code == 403

    def test_save_gap_section_auto_saves_content(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)

        res = auth_client.put(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary",
            json={"content": "Draft content being edited…"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["content"] == "Draft content being edited…"
        # Auto-save must NOT mark the section complete
        assert data["status"] == "pending"

    def test_save_document_fails_without_required_approvals(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)
        # executive_summary is pending → save should fail with 422

        res = auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/save-document"
        )
        assert res.status_code == 422
        assert "executive_summary" in res.json()["detail"]

    def test_save_document_succeeds_after_required_approvals(self, auth_client, test_project):
        project_id = test_project["id"]
        doc_id = self._setup_analysis(auth_client, project_id)

        # Approve executive_summary (document_header is already complete from gap analysis)
        auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/approve",
            json={"content": "Executive summary content."},
        )

        res = auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/save-document"
        )
        assert res.status_code == 201
        data = res.json()
        assert data["document_id"] == doc_id
        assert data["version_number"] == 2
        assert "version 2" in data["message"]

    def test_save_document_updates_document_version(self, auth_client, test_project):
        project_id = test_project["id"]
        doc_id = self._setup_analysis(auth_client, project_id)

        auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/approve",
            json={"content": "Executive summary."},
        )
        auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/save-document"
        )

        # Fetch the document — current_version should now be 2
        doc_res = auth_client.get(f"/api/v1/documents/{project_id}/{doc_id}")
        assert doc_res.status_code == 200
        assert doc_res.json()["current_version"] == 2

    def test_report_can_save_true_after_both_approved(self, auth_client, test_project):
        project_id = test_project["id"]
        self._setup_analysis(auth_client, project_id)

        # Approve executive_summary; document_header was already complete
        auth_client.post(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/section/executive_summary/approve",
            json={"content": "Executive summary."},
        )

        report_res = auth_client.get(
            f"/api/v1/req-assistant/{project_id}/gap-analysis/report"
        )
        assert report_res.status_code == 200
        assert report_res.json()["can_save"] is True
