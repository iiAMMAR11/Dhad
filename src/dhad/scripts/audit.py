#!/usr/bin/env python3
"""Fast, conservative audit for common Arabic and RTL regressions."""

from __future__ import annotations

import re
import sys
from pathlib import Path


TEXT_SUFFIXES = {".css", ".html", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"}
IGNORED = {".git", "node_modules", "dist", "build", ".next", ".vinext", "coverage"}
CHECKS = (
    ("physical-css", re.compile(r"^\s*(?:margin|padding|border|inset)-(?:left|right)\s*:", re.MULTILINE), "استخدم خاصية منطقية عندما يكون المعنى اتجاهيًا"),
    ("float-direction", re.compile(r"\bfloat\s*:\s*(?:left|right)\b"), "استبدل الاتجاه الفيزيائي بتخطيط منطقي"),
    ("default-sort", re.compile(r"\.sort\(\s*\)"), "استخدم Intl.Collator للترتيب الظاهر"),
    ("hidden-entry", re.compile(r"initial\s*=\s*\{?\{?[^}]*opacity\s*:\s*0"), "لا تُخفِ المحتوى الأساسي انتظارًا لحركة الدخول"),
)


def files(root: Path):
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES and not any(part in IGNORED for part in path.parts):
            yield path


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    findings = []
    for path in files(root):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for number, line in enumerate(lines, 1):
            for code, pattern, advice in CHECKS:
                if pattern.search(line):
                    findings.append((path.relative_to(root), number, code, advice))
    for path, number, code, advice in findings:
        print(f"{path}:{number} [{code}] {advice}")
    print(f"Dhad audit: {len(findings)} finding(s)")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
