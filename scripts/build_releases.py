#!/usr/bin/env python3
"""Build the synchronized, public-safe Dhad installers."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_NAME = "Dhad"
SKILL_NAME = "dhad"
SOURCE = ROOT / "src" / SKILL_NAME
PLUGIN_SOURCE = ROOT / "platforms" / "chatgpt" / SKILL_NAME
DIST = ROOT / "dist"
BANNED_FONT_SUFFIXES = {".otf", ".ttf", ".woff", ".woff2"}
BUNDLED_FONT_NAMES = {
    f"IBMPlexSansArabic-{weight}.woff2"
    for weight in ("Thin", "ExtraLight", "Light", "Regular", "Text", "Medium", "SemiBold", "Bold")
}
ZIP_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


OPENAI_INSTALL = """# تثبيت Dhad على ChatGPT وCodex

هذه حزمة OpenAI Plugin واحدة تدعم ChatGPT وCodex.

## ChatGPT

ثبّت `Dhad` من دليل Plugins العام بعد نشره، ثم استدعِه من محدد
`@` أو اكتب طلبًا يطابق وصفه. ملف ZIP هذا هو ملف الإرسال بصيغة `Skills only`،
وليس ملف Skill مستقلًا للرفع من واجهة ChatGPT.

## Codex

ثبّت Plugin من متصفح Plugins في تطبيق ChatGPT أو Codex CLI، ثم ابدأ جلسة جديدة.
يمكنك استدعاء السكيل باسم `$dhad` أو ترك Codex يختاره تلقائيًا.

امتداد Codex داخل IDE لا يدعم Plugins. لاستخدام المحتوى نفسه هناك، فك الضغط
وانسخ المجلد `skills/dhad/` إلى أحد المسارين:

```text
$HOME/.agents/skills/dhad/
<repository>/.agents/skills/dhad/
```
"""


AGENT_SKILL_INSTALL = """# تثبيت Dhad على Claude Chat وClaude Code

هذه حزمة Agent Skill واحدة تدعم Claude Chat وClaude Code، ولا تحتوي على Claude
Plugin أو ملف `.claude-plugin`.

## Claude Chat

ارفع ملف `Dhad-agent-skill.zip` كما هو من:
`Customize > Skills > Create skill > Upload a skill`، ثم فعّل السكيل. فعّل
Code execution and file creation إذا كان حسابك أو نطاق عملك يطلب ذلك.

## Claude Code

فك الضغط، ثم انسخ مجلد `dhad` إلى أحد المسارين:

```text
~/.claude/skills/dhad/
<project>/.claude/skills/dhad/
```

استدعِه باسم `/dhad` أو اكتب طلبًا يطابق وصفه ليختاره Claude
تلقائيًا.
"""


def version() -> str:
    value = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not value or any(part == "" for part in value.split(".")):
        raise SystemExit("VERSION is empty or invalid")
    return value


def is_allowed_bundled_font(file: Path, scan_root: Path) -> bool:
    relative = file.relative_to(scan_root).as_posix()
    allowed_prefixes = (
        "src/dhad/assets/starter/fonts/",
        "assets/starter/fonts/",
        "skills/dhad/assets/starter/fonts/",
    )
    return file.name in BUNDLED_FONT_NAMES and relative in {
        f"{prefix}{file.name}" for prefix in allowed_prefixes
    }


def assert_public_safe(path: Path, *, ignored_dirs: set[str] | None = None) -> None:
    """Reject font binaries except the eight licensed webfonts in their canonical path."""
    ignored = ignored_dirs or set()
    for current_root, dirs, files in os.walk(path):
        dirs[:] = [name for name in dirs if name not in ignored]
        for name in files:
            file = Path(current_root) / name
            if file.suffix.lower() in BANNED_FONT_SUFFIXES and not is_allowed_bundled_font(file, path):
                raise SystemExit(f"Refusing to package prohibited font file: {file}")


def copy_file(source: Path, target: Path) -> None:
    """Copy content without platform metadata or macOS copyfile side effects."""
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())


def copy_tree(source: Path, target: Path) -> None:
    if target.exists():
        raise FileExistsError(target)
    target.mkdir(parents=True)
    for item in sorted(source.rglob("*")):
        relative = item.relative_to(source)
        if item.is_symlink():
            raise SystemExit(f"Refusing to package symlink: {item}")
        if item.is_dir():
            (target / relative).mkdir(parents=True, exist_ok=True)
        elif item.is_file():
            copy_file(item, target / relative)


def add_common_notices(package_root: Path, install_text: str) -> None:
    copy_file(ROOT / "LICENSE", package_root / "LICENSE")
    copy_file(ROOT / "NOTICE.md", package_root / "NOTICE.md")
    (package_root / "INSTALL.md").write_text(install_text, encoding="utf-8")


def copy_skill(target: Path, *, include_openai_metadata: bool) -> None:
    copy_tree(SOURCE, target)
    if not include_openai_metadata:
        shutil.rmtree(target / "agents", ignore_errors=True)


def zip_tree(source_root: Path, archive: Path) -> None:
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for file in sorted(p for p in source_root.rglob("*") if p.is_file()):
            relative = file.relative_to(source_root.parent).as_posix()
            info = zipfile.ZipInfo(relative, ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            output.writestr(info, file.read_bytes())


def build_agent_skill(staging: Path) -> Path:
    package_root = staging / SKILL_NAME
    copy_skill(package_root, include_openai_metadata=False)
    add_common_notices(package_root, AGENT_SKILL_INSTALL)
    archive = DIST / f"{PUBLIC_NAME}-agent-skill.zip"
    assert_public_safe(package_root)
    zip_tree(package_root, archive)
    return archive


def build_openai_plugin(staging: Path, release_version: str) -> Path:
    package_root = staging / SKILL_NAME
    copy_tree(PLUGIN_SOURCE, package_root)
    plugin_skill = package_root / "skills" / SKILL_NAME
    copy_skill(plugin_skill, include_openai_metadata=True)
    copy_file(ROOT / "LICENSE", package_root / "LICENSE")
    copy_file(ROOT / "NOTICE.md", package_root / "NOTICE.md")
    copy_file(ROOT / "PRIVACY.md", package_root / "PRIVACY.md")
    copy_file(ROOT / "TERMS.md", package_root / "TERMS.md")
    copy_file(ROOT / "SUPPORT.md", package_root / "SUPPORT.md")
    (package_root / "INSTALL.md").write_text(OPENAI_INSTALL, encoding="utf-8")

    manifest_path = package_root / ".codex-plugin" / "plugin.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = release_version
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    archive = DIST / f"{PUBLIC_NAME}-openai-plugin.zip"
    assert_public_safe(package_root)
    zip_tree(package_root, archive)
    return archive


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    release_version = version()
    assert_public_safe(ROOT, ignored_dirs={".git", ".next", "dist", "node_modules"})

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    archives: list[Path] = []
    with tempfile.TemporaryDirectory(prefix="dhad-") as temp:
        temp_root = Path(temp)
        agent_skill_root = temp_root / "agent-skill"
        agent_skill_root.mkdir()
        archives.append(build_agent_skill(agent_skill_root))

        plugin_root = temp_root / "openai-plugin"
        plugin_root.mkdir()
        archives.append(build_openai_plugin(plugin_root, release_version))

    sums = "\n".join(f"{checksum(path)}  {path.name}" for path in sorted(archives)) + "\n"
    (DIST / "SHA256SUMS.txt").write_text(sums, encoding="utf-8")

    for archive in sorted(archives):
        print(archive.relative_to(ROOT))
    print((DIST / "SHA256SUMS.txt").relative_to(ROOT))


if __name__ == "__main__":
    main()
