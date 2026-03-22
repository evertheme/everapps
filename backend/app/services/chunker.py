import re

from app.services.llm.base import BaseLLMProvider

# ── Provider context window map ───────────────────────────────────────────────
# Format: provider_name -> list of (model_substring, context_tokens)
# Entries are checked in order; first match wins. "default" always matches.
_PROVIDER_CONTEXT_TOKENS: dict[str, list[tuple[str, int]]] = {
    "openai": [
        ("gpt-4o", 128_000),
        ("gpt-4", 8_192),
        ("default", 16_385),
    ],
    "anthropic": [
        ("claude", 200_000),
        ("default", 100_000),
    ],
    "azure_openai": [
        ("default", 128_000),
    ],
    "ollama": [
        ("default", 4_096),
    ],
}

_FALLBACK_CHUNK_CHARS = 12_000

# Approximate English prose characters per token
_CHARS_PER_TOKEN = 4

# Fraction of context window allocated to document content
_UTILISATION = 0.60

# Fixed overhead: system prompt (~500 tokens) + expected output (~4 096 tokens)
_OVERHEAD_TOKENS = 4_596


def resolve_chunk_size(provider: BaseLLMProvider) -> int:
    """Return the safe character budget per LLM call for the given provider/model."""
    pname = provider.provider_name
    model = (provider.config.model or "").lower()

    candidates = _PROVIDER_CONTEXT_TOKENS.get(pname, [])
    context_tokens = _FALLBACK_CHUNK_CHARS // _CHARS_PER_TOKEN  # fallback

    for model_key, tokens in candidates:
        if model_key == "default" or model_key in model:
            context_tokens = tokens
            break

    usable_tokens = max(1, int(context_tokens * _UTILISATION) - _OVERHEAD_TOKENS)
    return usable_tokens * _CHARS_PER_TOKEN


def chunk_document(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Split *text* into chunks no larger than *chunk_size* chars, with *overlap*
    chars of repeated context prepended at each boundary.

    Strategy (in priority order):
    1. Split on [§ Section] markers — keeps logical sections together.
    2. If a section exceeds chunk_size, fall back to paragraph (\\n\\n) splits.
    3. If a single paragraph exceeds chunk_size, hard-split at chunk_size.
    """
    if len(text) <= chunk_size:
        return [text]

    sections = _split_on_section_markers(text)
    raw_chunks = _pack_sections(sections, chunk_size)
    return _apply_overlap(raw_chunks, overlap)


def build_preamble(chunk: str) -> str:
    """
    Prepend a context header listing the sections present in this chunk.
    The LLM system prompt instructs it not to generate stories from the header.
    """
    headings = re.findall(r"^\[§ (.+)\]$", chunk, re.MULTILINE)
    if not headings:
        return chunk

    headings_str = ", ".join(f"§ {h}" for h in headings)
    preamble = (
        "[Document context — do not generate stories from this section]\n"
        f"Sections in this chunk: {headings_str}\n"
        "[End context]\n\n"
    )
    return preamble + chunk


# ── Internal helpers ──────────────────────────────────────────────────────────

def _split_on_section_markers(text: str) -> list[str]:
    """Split text into sections at [§ …] boundaries."""
    parts = re.split(r"(?=^\[§ )", text, flags=re.MULTILINE)
    return [p for p in parts if p.strip()]


def _pack_sections(sections: list[str], chunk_size: int) -> list[str]:
    """Greedily accumulate sections into chunks up to chunk_size chars."""
    chunks: list[str] = []
    current_parts: list[str] = []
    current_len = 0

    for section in sections:
        if len(section) > chunk_size:
            # Flush current accumulation first
            if current_parts:
                chunks.append("\n\n".join(current_parts))
                current_parts = []
                current_len = 0
            # Split the oversized section at paragraph boundaries
            for para_chunk in _split_paragraphs(section, chunk_size):
                chunks.append(para_chunk)
        elif current_len + len(section) > chunk_size and current_parts:
            chunks.append("\n\n".join(current_parts))
            current_parts = [section]
            current_len = len(section)
        else:
            current_parts.append(section)
            current_len += len(section)

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks


def _split_paragraphs(text: str, chunk_size: int) -> list[str]:
    """Split text at paragraph boundaries; hard-split any paragraph that still exceeds chunk_size."""
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if len(para) > chunk_size:
            if current:
                chunks.append("\n\n".join(current))
                current = []
                current_len = 0
            # Hard-split the oversized paragraph
            for i in range(0, len(para), chunk_size):
                chunks.append(para[i: i + chunk_size])
        elif current_len + len(para) > chunk_size and current:
            chunks.append("\n\n".join(current))
            current = [para]
            current_len = len(para)
        else:
            current.append(para)
            current_len += len(para)

    if current:
        chunks.append("\n\n".join(current))

    return chunks


def _apply_overlap(chunks: list[str], overlap: int) -> list[str]:
    """Prepend the tail of the previous chunk to each subsequent chunk."""
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        tail = chunks[i - 1][-overlap:]
        result.append(tail + "\n\n" + chunks[i])
    return result
