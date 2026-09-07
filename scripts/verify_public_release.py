#!/usr/bin/env python3
"""Validate public source and both installers for a public release."""

from __future__ import annotations

import hashlib
import json
import os
import re
import zipfile
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PUBLIC_NAME = "Dhad"
SKILL_NAME = "dhad"
OPENAI_ARCHIVE = f"{PUBLIC_NAME}-openai-plugin.zip"
AGENT_SKILL_ARCHIVE = f"{PUBLIC_NAME}-agent-skill.zip"
BANNED_FONT_SUFFIXES = {".otf", ".ttf", ".woff", ".woff2"}
BUNDLED_FONT_NAMES = {
    f"IBMPlexSansArabic-{weight}.woff2"
    for weight in ("Thin", "ExtraLight", "Light", "Regular", "Text", "Medium", "SemiBold", "Bold")
}
BANNED_SECRET_PATTERNS = (
    re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
IGNORED_SOURCE_PARTS = {".git", ".next", ".vinext", ".wrangler", "node_modules", "dist"}


def source_font_paths() -> set[str]:
    return {f"src/dhad/assets/starter/fonts/{name}" for name in BUNDLED_FONT_NAMES}


def archive_font_paths(archive_name: str) -> set[str]:
    if archive_name == OPENAI_ARCHIVE:
        prefix = "dhad/skills/dhad/assets/starter/fonts"
    elif archive_name == AGENT_SKILL_ARCHIVE:
        prefix = "dhad/assets/starter/fonts"
    else:
        return set()
    return {f"{prefix}/{name}" for name in BUNDLED_FONT_NAMES}


def fail(message: str) -> None:
    raise SystemExit(message)


def validate_skill(text: str, location: str) -> str:
    if not text.startswith("---\n"):
        fail(f"Missing YAML frontmatter: {location}")
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        fail(f"Unterminated YAML frontmatter: {location}")
    frontmatter = parts[1]

    fields: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    if fields.get("name") != SKILL_NAME:
        fail(f"Unexpected skill name: {location}")
    description = fields.get("description", "")
    if not description:
        fail(f"Missing skill description: {location}")
    if len(description) > 200:
        fail(f"Claude-compatible description exceeds 200 characters ({len(description)}): {location}")
    return description


def public_source_files():
    """Yield authored source only, excluding generated dependencies and build output."""
    for current_root, directories, files in os.walk(ROOT):
        directories[:] = [name for name in directories if name not in IGNORED_SOURCE_PARTS]
        for name in files:
            yield Path(current_root) / name


def validate_source() -> None:
    required = [
        ROOT / "LICENSE",
        ROOT / "NOTICE.md",
        ROOT / "PRIVACY.md",
        ROOT / "TERMS.md",
        ROOT / "src" / SKILL_NAME / "SKILL.md",
        ROOT / "src" / SKILL_NAME / "references" / "outputs.md",
        ROOT / "src" / SKILL_NAME / "assets" / "tokens" / "dhad.tokens.json",
        ROOT / "platforms" / "chatgpt" / SKILL_NAME / ".codex-plugin" / "plugin.json",
    ]
    for path in required:
        if not path.is_file():
            fail(f"Missing required file: {path.relative_to(ROOT)}")

    source_files = list(public_source_files())
    for path in source_files:
        relative = path.relative_to(ROOT).as_posix()
        if path.is_file() and path.suffix.lower() in BANNED_FONT_SUFFIXES and relative not in source_font_paths():
            fail(f"Public source contains prohibited font file: {path.relative_to(ROOT)}")
        if path.is_file() and path.suffix.lower() in {".md", ".json", ".css", ".js", ".py", ".html", ".ts", ".dart", ".swift"}:
            text = path.read_text(encoding="utf-8")
            for pattern in BANNED_SECRET_PATTERNS:
                if pattern.search(text):
                    fail(f"Possible secret in {path.relative_to(ROOT)}")

    for path in (path for path in source_files if path.suffix.lower() == ".json"):
        json.loads(path.read_text(encoding="utf-8"))
    skill_description = validate_skill((ROOT / "src" / SKILL_NAME / "SKILL.md").read_text(encoding="utf-8"), "source skill")
    manifest = json.loads((ROOT / "platforms" / "chatgpt" / SKILL_NAME / ".codex-plugin" / "plugin.json").read_text(encoding="utf-8"))
    for capability in ("Arabic", "RTL", "spacing", "PDFs", "images", "ads", "search"):
        if capability not in skill_description:
            fail(f"Source skill description lost the {capability} capability")
        if capability not in manifest.get("description", ""):
            fail(f"Plugin description lost the {capability} capability")


def validate_members(archive_name: str, members: list[zipfile.ZipInfo]) -> list[str]:
    names = [member.filename for member in members]
    if len(names) != len(set(names)):
        fail(f"Duplicate ZIP member in {archive_name}")
    if not names:
        fail(f"Empty release archive: {archive_name}")

    for member in members:
        path = PurePosixPath(member.filename)
        if path.is_absolute() or ".." in path.parts or "\\" in member.filename:
            fail(f"Unsafe ZIP path in {archive_name}: {member.filename}")
        if not member.filename.startswith(f"{SKILL_NAME}/"):
            fail(f"Archive must have {SKILL_NAME} as its root: {archive_name}")
        if (member.external_attr >> 16) & 0o170000 == 0o120000:
            fail(f"Symlink is not allowed in {archive_name}: {member.filename}")
        if path.suffix.lower() in BANNED_FONT_SUFFIXES and member.filename not in archive_font_paths(archive_name):
            fail(f"Prohibited font in {archive_name}: {member.filename}")
        if ".claude-plugin" in path.parts:
            fail(f"Claude plugin metadata is not allowed in {archive_name}: {member.filename}")
    return names


def require_install_text(bundle: zipfile.ZipFile, name: str, platforms: tuple[str, ...]) -> None:
    try:
        text = bundle.read(name).decode("utf-8")
    except KeyError:
        fail(f"Missing INSTALL.md: {bundle.filename}")
    for platform in platforms:
        if platform not in text:
            fail(f"INSTALL.md in {bundle.filename} does not document {platform}")


def shared_skill_payload(bundle: zipfile.ZipFile, prefix: str) -> dict[str, bytes]:
    """Return vendor-neutral skill files keyed by their path inside the skill."""
    ignored_roots = {"INSTALL.md", "LICENSE", "NOTICE.md"}
    payload: dict[str, bytes] = {}
    for name in bundle.namelist():
        if not name.startswith(prefix) or name.endswith("/"):
            continue
        relative = name.removeprefix(prefix)
        if not relative or relative in ignored_roots or relative.startswith("agents/"):
            continue
        payload[relative] = bundle.read(name)
    return payload


def validate_archives(version: str) -> None:
    names = {OPENAI_ARCHIVE, AGENT_SKILL_ARCHIVE}
    actual = {path.name for path in DIST.glob("*.zip")}
    if actual != names:
        fail(f"Release archive mismatch. Expected {sorted(names)}, got {sorted(actual)}")

    for archive in sorted(DIST.glob("*.zip")):
        with zipfile.ZipFile(archive) as bundle:
            members = validate_members(archive.name, bundle.infolist())
            install_name = f"{SKILL_NAME}/INSTALL.md"
            missing_fonts = archive_font_paths(archive.name) - set(members)
            if missing_fonts:
                fail(f"Missing bundled IBM Plex Sans Arabic webfonts in {archive.name}: {sorted(missing_fonts)}")

            if archive.name == OPENAI_ARCHIVE:
                manifest_name = f"{SKILL_NAME}/.codex-plugin/plugin.json"
                skill_name = f"{SKILL_NAME}/skills/{SKILL_NAME}/SKILL.md"
                metadata_name = f"{SKILL_NAME}/skills/{SKILL_NAME}/agents/openai.yaml"
                if manifest_name not in members:
                    fail(f"Missing plugin manifest in {archive.name}")
                if skill_name not in members:
                    fail(f"Missing bundled skill in {archive.name}")
                if metadata_name not in members:
                    fail(f"Missing OpenAI skill metadata in {archive.name}")
                if [name for name in members if name.endswith("/SKILL.md")] != [skill_name]:
                    fail(f"OpenAI plugin must contain exactly one bundled SKILL.md: {archive.name}")
                validate_skill(bundle.read(skill_name).decode("utf-8"), f"{archive.name}:{skill_name}")
                manifest = json.loads(bundle.read(manifest_name).decode("utf-8"))
                if manifest.get("version") != version:
                    fail(f"Plugin version mismatch in {archive.name}")
                if manifest.get("name") != SKILL_NAME:
                    fail(f"Plugin name mismatch in {archive.name}")
                if manifest.get("skills") != "./skills/":
                    fail(f"Plugin skills path mismatch in {archive.name}")
                interface = manifest.get("interface", {})
                for key in ("composerIcon", "logo"):
                    reference = interface.get(key, "")
                    if not reference:
                        fail(f"Plugin manifest is missing interface.{key} in {archive.name}")
                    asset_name = f"{SKILL_NAME}/{reference.removeprefix('./')}"
                    if asset_name not in members:
                        fail(f"Plugin interface.{key} points outside {archive.name}: {reference}")
                require_install_text(bundle, install_name, ("ChatGPT", "Codex"))
            elif archive.name == AGENT_SKILL_ARCHIVE:
                skill_name = f"{SKILL_NAME}/SKILL.md"
                if [name for name in members if name.endswith("/SKILL.md")] != [skill_name]:
                    fail(f"Agent Skill must contain one root SKILL.md: {archive.name}")
                if any(".codex-plugin" in PurePosixPath(name).parts for name in members):
                    fail(f"Agent Skill unexpectedly contains an OpenAI plugin manifest: {archive.name}")
                if any(name.startswith(f"{SKILL_NAME}/agents/") for name in members):
                    fail(f"Agent Skill unexpectedly contains OpenAI-only metadata: {archive.name}")
                validate_skill(bundle.read(skill_name).decode("utf-8"), f"{archive.name}:{skill_name}")
                require_install_text(bundle, install_name, ("Claude Chat", "Claude Code"))
            else:
                fail(f"Unexpected release archive: {archive.name}")

    with zipfile.ZipFile(DIST / OPENAI_ARCHIVE) as openai_bundle, zipfile.ZipFile(DIST / AGENT_SKILL_ARCHIVE) as agent_bundle:
        openai_payload = shared_skill_payload(openai_bundle, f"{SKILL_NAME}/skills/{SKILL_NAME}/")
        agent_payload = shared_skill_payload(agent_bundle, f"{SKILL_NAME}/")
        if openai_payload != agent_payload:
            missing_from_openai = sorted(set(agent_payload) - set(openai_payload))
            missing_from_agent = sorted(set(openai_payload) - set(agent_payload))
            changed = sorted(path for path in set(openai_payload) & set(agent_payload) if openai_payload[path] != agent_payload[path])
            fail(
                "Shared skill payload drifted between installers: "
                f"missing from OpenAI={missing_from_openai}, missing from Agent Skill={missing_from_agent}, changed={changed}"
            )

    checksum_file = DIST / "SHA256SUMS.txt"
    if not checksum_file.is_file():
        fail("Missing SHA256SUMS.txt")

    listed: dict[str, str] = {}
    for line in checksum_file.read_text(encoding="utf-8").splitlines():
        try:
            digest, name = line.split("  ", 1)
        except ValueError:
            fail(f"Malformed checksum line: {line}")
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            fail(f"Malformed SHA-256 digest for {name}")
        if name in listed:
            fail(f"Duplicate checksum entry: {name}")
        listed[name] = digest
    if set(listed) != names:
        fail(f"Checksum file mismatch. Expected {sorted(names)}, got {sorted(listed)}")
    for name, expected in listed.items():
        actual = hashlib.sha256((DIST / name).read_bytes()).hexdigest()
        if actual != expected:
            fail(f"Checksum mismatch for {name}")


def main() -> None:
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    validate_source()
    validate_archives(version)
    print("Public source and both release installers are valid.")


if __name__ == "__main__":
    main()
