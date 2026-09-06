#!/usr/bin/env python3
"""Validate Dhad tokens and generate every platform mapping.

The script has no third-party dependencies. Run it after changing the canonical
DTCG source. Use ``--check`` in CI to fail when committed outputs are stale.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE = REPO_ROOT / "src/dhad/assets/tokens/dhad.tokens.json"
OUTPUTS = {
    "css": REPO_ROOT / "src/dhad/assets/starter/css/dhad.tokens.css",
    "react_native": REPO_ROOT / "src/dhad/assets/examples/react-native/dhad-theme.ts",
    "flutter": REPO_ROOT / "src/dhad/assets/examples/flutter/dhad_theme.dart",
    "swiftui": REPO_ROOT / "src/dhad/assets/examples/swiftui/DhadTheme.swift",
    "compose": REPO_ROOT / "src/dhad/assets/examples/android-compose/DhadTheme.kt",
}

ALIAS_RE = re.compile(r"^\{([a-zA-Z0-9_.-]+)\}$")
DIMENSION_RE = re.compile(r"^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%)$")
DURATION_RE = re.compile(r"^(?:\d+\.?\d*|\.\d+)(?:ms|s)$")
RGBA_RE = re.compile(
    r"^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$",
    re.IGNORECASE,
)


def token_nodes(document: dict[str, Any]) -> dict[str, dict[str, Any]]:
    nodes: dict[str, dict[str, Any]] = {}

    def visit(value: Any, path: tuple[str, ...]) -> None:
        if not isinstance(value, dict):
            return
        if "$value" in value:
            nodes[".".join(path)] = value
            return
        for key, child in value.items():
            if not key.startswith("$"):
                visit(child, (*path, key))

    visit(document, ())
    return nodes


class Resolver:
    def __init__(self, document: dict[str, Any]) -> None:
        self.document = document
        self.nodes = token_nodes(document)
        self.cache: dict[str, Any] = {}

    def resolve(self, path: str, stack: tuple[str, ...] = ()) -> Any:
        if path in self.cache:
            return self.cache[path]
        if path not in self.nodes:
            raise ValueError(f"Unknown token alias: {path}")
        if path in stack:
            cycle = " -> ".join((*stack, path))
            raise ValueError(f"Token alias cycle: {cycle}")
        value = self._resolve_value(self.nodes[path]["$value"], (*stack, path))
        self.cache[path] = value
        return value

    def _resolve_value(self, value: Any, stack: tuple[str, ...]) -> Any:
        if isinstance(value, str):
            match = ALIAS_RE.fullmatch(value)
            if match:
                return self.resolve(match.group(1), stack)
            if "{" in value or "}" in value:
                raise ValueError(f"Aliases must occupy the complete value: {value}")
            return value
        if isinstance(value, list):
            return [self._resolve_value(item, stack) for item in value]
        if isinstance(value, dict):
            return {key: self._resolve_value(item, stack) for key, item in value.items()}
        return value

    def type_of(self, path: str) -> str:
        return str(self.nodes[path]["$type"])


def parse_color(value: str) -> tuple[float, float, float, float]:
    if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return tuple(int(value[index : index + 2], 16) / 255 for index in (1, 3, 5)) + (1.0,)
    if re.fullmatch(r"#[0-9a-fA-F]{8}", value):
        channels = tuple(int(value[index : index + 2], 16) / 255 for index in (1, 3, 5, 7))
        return channels  # type: ignore[return-value]
    match = RGBA_RE.fullmatch(value)
    if match:
        red, green, blue = (int(match.group(index)) / 255 for index in (1, 2, 3))
        return red, green, blue, float(match.group(4))
    raise ValueError(f"Unsupported color syntax: {value}")


def composite(foreground: tuple[float, float, float, float], background: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    alpha = foreground[3] + background[3] * (1 - foreground[3])
    if alpha == 0:
        return 0, 0, 0, 0
    rgb = tuple(
        (foreground[index] * foreground[3] + background[index] * background[3] * (1 - foreground[3])) / alpha
        for index in range(3)
    )
    return rgb + (alpha,)


def relative_luminance(color: tuple[float, float, float, float]) -> float:
    def linear(channel: float) -> float:
        return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4

    red, green, blue = (linear(value) for value in color[:3])
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def contrast_ratio(foreground: str, background: str) -> float:
    bg = parse_color(background)
    fg = parse_color(foreground)
    if bg[3] < 1:
        bg = composite(bg, (1, 1, 1, 1))
    if fg[3] < 1:
        fg = composite(fg, bg)
    lighter, darker = sorted((relative_luminance(fg), relative_luminance(bg)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def validate(document: dict[str, Any], resolver: Resolver) -> list[str]:
    errors: list[str] = []
    metadata = document.get("$extensions", {}).get("com.dhad", {})
    if metadata.get("name") != "Dhad" or metadata.get("namespace") != "dhad":
        errors.append("Canonical metadata must name Dhad and the dhad namespace")

    allowed_weights = {100, 200, 300, 400, 450, 500, 600, 700}

    def aliases_only(value: Any) -> bool:
        if isinstance(value, str):
            return ALIAS_RE.fullmatch(value) is not None
        if isinstance(value, list):
            return all(aliases_only(item) for item in value)
        if isinstance(value, dict):
            return all(aliases_only(item) for item in value.values())
        return False

    for path, node in resolver.nodes.items():
        token_type = node.get("$type")
        if not token_type:
            errors.append(f"{path}: missing $type")
            continue
        try:
            value = resolver.resolve(path)
        except ValueError as error:
            errors.append(f"{path}: {error}")
            continue
        if token_type == "fontWeight" and value not in allowed_weights:
            errors.append(f"{path}: unsupported font weight {value}")
        if token_type == "dimension" and (not isinstance(value, str) or not DIMENSION_RE.fullmatch(value)):
            errors.append(f"{path}: invalid dimension {value!r}")
        if token_type == "duration" and (not isinstance(value, str) or not DURATION_RE.fullmatch(value)):
            errors.append(f"{path}: invalid duration {value!r}")
        if token_type == "color":
            try:
                parse_color(value)
            except (TypeError, ValueError) as error:
                errors.append(f"{path}: {error}")
        raw_value = node["$value"]
        if path.startswith(("semantic.", "recipe.", "component.")) and not aliases_only(raw_value):
            errors.append(f"{path}: semantic, recipe, and component layers must alias lower-level tokens")
        if isinstance(raw_value, str) and (match := ALIAS_RE.fullmatch(raw_value)):
            target = match.group(1)
            if target in resolver.nodes and resolver.type_of(target) != token_type:
                errors.append(f"{path}: {token_type} token aliases {resolver.type_of(target)} token {target}")

    contrast_pairs: list[tuple[str, str, str, float]] = []
    for theme in ("dark", "light"):
        prefix = f"semantic.color.{theme}"
        canvas = f"{prefix}.background.canvas"
        contrast_pairs.extend(
            [
                (f"{theme} primary text", f"{prefix}.text.primary", canvas, 4.5),
                (f"{theme} secondary text", f"{prefix}.text.secondary", canvas, 4.5),
                (f"{theme} tertiary text", f"{prefix}.text.tertiary", canvas, 4.5),
                (f"{theme} focus indicator", f"{prefix}.border.focus", canvas, 3.0),
                (f"{theme} action", f"{prefix}.action.onBackground", f"{prefix}.action.background", 4.5),
                (f"{theme} success", f"{prefix}.success.onBackground", f"{prefix}.success.background", 4.5),
                (f"{theme} danger", f"{prefix}.danger.onBackground", f"{prefix}.danger.background", 4.5),
                (f"{theme} warning", f"{prefix}.warning.onBackground", f"{prefix}.warning.background", 4.5),
                (f"{theme} assistive", f"{prefix}.assistive.onBackground", f"{prefix}.assistive.background", 4.5),
                (f"{theme} timecode", f"{prefix}.timecode.onBackground", f"{prefix}.timecode.background", 4.5),
                (f"{theme} action soft", f"{prefix}.action.foreground", f"{prefix}.action.soft", 4.5),
                (f"{theme} success soft", f"{prefix}.success.foreground", f"{prefix}.success.soft", 4.5),
                (f"{theme} danger soft", f"{prefix}.danger.foreground", f"{prefix}.danger.soft", 4.5),
                (f"{theme} warning soft", f"{prefix}.warning.foreground", f"{prefix}.warning.soft", 4.5),
                (f"{theme} assistive soft", f"{prefix}.assistive.foreground", f"{prefix}.assistive.soft", 4.5),
                (f"{theme} timecode soft", f"{prefix}.timecode.foreground", f"{prefix}.timecode.soft", 4.5),
            ]
        )
        contrast_pairs.append(
            (
                f"{theme} progress fill",
                f"component.color.{theme}.progress.fill",
                f"component.color.{theme}.progress.track",
                3.0,
            )
        )
        contrast_pairs.append(
            (
                f"{theme} field boundary",
                f"component.color.{theme}.field.border",
                f"component.color.{theme}.field.background",
                3.0,
            )
        )

    for label, foreground_path, background_path, minimum in contrast_pairs:
        try:
            ratio = contrast_ratio(resolver.resolve(foreground_path), resolver.resolve(background_path))
            if ratio + 1e-9 < minimum:
                errors.append(f"{label}: contrast {ratio:.2f}:1 is below {minimum:.1f}:1")
        except ValueError as error:
            errors.append(f"{label}: {error}")

    if resolver.resolve("semantic.size.touch") != "44px":
        errors.append("Cross-platform minimum touch target must remain 44px")
    if resolver.resolve("semantic.size.touchAndroid") != "48px":
        errors.append("Android minimum touch target must remain 48px")
    return errors


def css_font_family(value: Iterable[str]) -> str:
    generic = {"serif", "sans-serif", "monospace", "system-ui", "cursive", "fantasy"}
    return ", ".join(item if item in generic or item.startswith("-") else json.dumps(item, ensure_ascii=False) for item in value)


def css_value(value: Any, token_type: str) -> str:
    if token_type == "fontFamily":
        return css_font_family(value)
    if token_type == "cubicBezier":
        return f"cubic-bezier({', '.join(format(number, 'g') for number in value)})"
    if token_type == "shadow":
        return " ".join((value["offsetX"], value["offsetY"], value["blur"], value["spread"], value["color"]))
    if isinstance(value, (int, float)):
        return format(value, "g")
    return str(value)


def path_map(*items: tuple[str, str]) -> OrderedDict[str, str]:
    return OrderedDict(items)


GLOBAL_CSS = path_map(
    ("font-body", "primitive.font.family.sans"),
    ("font-display", "primitive.font.family.display"),
    ("font-mono", "primitive.font.family.mono"),
    ("font-weight-light", "primitive.font.weight.light"),
    ("font-weight-regular", "primitive.font.weight.regular"),
    ("font-weight-medium", "primitive.font.weight.medium"),
    ("font-weight-bold", "primitive.font.weight.bold"),
    ("font-weight-semibold", "primitive.font.weight.semibold"),
    *((f"font-size-{step}", f"primitive.font.size.{step}") for step in ("100", "200", "300", "400", "500", "600", "700", "800", "900", "1000")),
    ("line-tight", "primitive.font.lineHeight.tight"),
    ("line-heading", "primitive.font.lineHeight.heading"),
    ("line-body", "primitive.font.lineHeight.body"),
    ("line-reading", "primitive.font.lineHeight.reading"),
    *((f"space-{step}", f"semantic.space.{step}") for step in range(9)),
    *((f"radius-{name}", f"semantic.radius.{name}") for name in ("xs", "sm", "md", "lg", "xl", "round")),
    ("size-touch", "semantic.size.touch"),
    ("size-touch-android", "semantic.size.touchAndroid"),
    ("size-topbar", "semantic.size.topbar"),
    ("size-content", "semantic.size.content"),
    ("size-project", "semantic.size.project"),
    ("size-reading", "semantic.size.reading"),
    ("density-comfortable-control", "semantic.density.comfortable.controlHeight"),
    ("density-comfortable-hit-target", "semantic.density.comfortable.hitTarget"),
    ("density-comfortable-inline-gap", "semantic.density.comfortable.inlineGap"),
    ("density-comfortable-section-gap", "semantic.density.comfortable.sectionGap"),
    ("density-compact-control", "semantic.density.compact.controlHeight"),
    ("density-compact-hit-target", "semantic.density.compact.hitTarget"),
    ("density-compact-inline-gap", "semantic.density.compact.inlineGap"),
    ("density-compact-section-gap", "semantic.density.compact.sectionGap"),
    *((f"breakpoint-{name}", f"semantic.breakpoint.{name}") for name in ("small", "mobile", "tablet", "content", "wide")),
    ("focus-width", "semantic.focus.width"),
    ("focus-offset", "semantic.focus.offset"),
    *((f"duration-{name}", f"semantic.motion.duration.{name}") for name in ("instant", "fast", "base", "enter", "sheet", "slow", "progress")),
    *((f"ease-{name}", f"semantic.motion.easing.{name}") for name in ("standard", "expo", "quart", "quint", "exit")),
    ("blur-overlay", "primitive.dimension.size.blurOverlay"),
    *((f"z-{name}", f"semantic.zIndex.{name}") for name in ("content", "sticky", "topbar", "menu", "modal", "sheet", "toast")),
    ("button-min-height", "component.dimension.button.minHeight"),
    ("button-compact-height", "component.dimension.button.compactHeight"),
    ("button-hit-target", "component.dimension.button.hitTarget"),
    ("button-radius", "component.dimension.button.radius"),
    ("button-padding-inline", "component.dimension.button.paddingInline"),
    ("button-padding-block", "semantic.space.2"),
    ("button-gap", "component.dimension.button.gap"),
    ("field-min-height", "component.dimension.field.minHeight"),
    ("field-radius", "component.dimension.field.radius"),
    ("field-padding-inline", "component.dimension.field.paddingInline"),
    ("field-padding-block", "component.dimension.field.paddingBlock"),
    ("card-radius", "component.dimension.card.radius"),
    ("card-project-radius", "component.dimension.card.projectRadius"),
    ("card-padding", "component.dimension.card.padding"),
    ("card-project-padding", "component.dimension.card.projectPadding"),
    ("dialog-max-width", "component.dimension.dialog.maxWidth"),
    ("dialog-radius", "component.dimension.dialog.radius"),
    ("dialog-sheet-radius", "component.dimension.dialog.sheetRadius"),
    ("dialog-padding", "component.dimension.dialog.padding"),
    ("toast-radius", "component.dimension.toast.radius"),
    ("toast-padding-inline", "component.dimension.toast.paddingInline"),
    ("toast-padding-block", "component.dimension.toast.paddingBlock"),
    ("progress-track-size", "component.dimension.progress.height"),
    ("progress-radius", "component.dimension.progress.radius"),
)


def theme_css_map(theme: str) -> OrderedDict[str, str]:
    semantic = f"semantic.color.{theme}"
    component = f"component.color.{theme}"
    shadow = f"semantic.shadow.{theme}"
    return path_map(
        ("color-bg", f"{semantic}.background.canvas"),
        ("color-topbar", f"{semantic}.background.topbar"),
        ("color-backdrop", f"{semantic}.background.backdrop"),
        ("color-surface-1", f"{semantic}.surface.base"),
        ("color-surface-2", f"{semantic}.surface.raised"),
        ("color-surface-3", f"{semantic}.surface.overlay"),
        ("color-input", f"{semantic}.surface.input"),
        ("color-hover", f"{semantic}.surface.hover"),
        ("color-disabled", f"{semantic}.surface.disabled"),
        ("color-border", f"{semantic}.border.subtle"),
        ("color-border-strong", f"{semantic}.border.strong"),
        ("color-border-control", f"{semantic}.border.control"),
        ("color-border-focus", f"{semantic}.border.focus"),
        ("color-text-1", f"{semantic}.text.primary"),
        ("color-text-2", f"{semantic}.text.secondary"),
        ("color-text-3", f"{semantic}.text.tertiary"),
        ("color-text-disabled", f"{semantic}.text.disabled"),
        ("color-text-inverse", f"{semantic}.text.inverse"),
        ("color-placeholder", f"{semantic}.text.tertiary"),
        ("color-action", f"{semantic}.action.background"),
        ("color-action-text", f"{semantic}.action.foreground"),
        ("color-on-action", f"{semantic}.action.onBackground"),
        ("color-on-action-fill", f"{semantic}.action.onBackground"),
        ("color-accent", f"{semantic}.action.background"),
        ("color-accent-text", f"{semantic}.action.foreground"),
        ("color-on-accent", f"{semantic}.action.onBackground"),
        ("color-on-accent-fill", f"{semantic}.action.onBackground"),
        ("color-accent-hover", f"{semantic}.action.hover"),
        ("color-accent-active", f"{semantic}.action.active"),
        ("color-accent-soft", f"{semantic}.action.soft"),
        ("color-success", f"{semantic}.success.foreground"),
        ("color-success-fill", f"{semantic}.success.background"),
        ("color-on-success", f"{semantic}.success.onBackground"),
        ("color-on-success-fill", f"{semantic}.success.onBackground"),
        ("color-success-hover", f"{semantic}.success.hover"),
        ("color-success-active", f"{semantic}.success.active"),
        ("color-success-soft", f"{semantic}.success.soft"),
        ("color-danger", f"{semantic}.danger.foreground"),
        ("color-danger-fill", f"{semantic}.danger.background"),
        ("color-on-danger", f"{semantic}.danger.onBackground"),
        ("color-on-danger-fill", f"{semantic}.danger.onBackground"),
        ("color-danger-hover", f"{semantic}.danger.hover"),
        ("color-danger-active", f"{semantic}.danger.active"),
        ("color-danger-soft", f"{semantic}.danger.soft"),
        ("color-warning", f"{semantic}.warning.foreground"),
        ("color-warning-fill", f"{semantic}.warning.background"),
        ("color-on-warning", f"{semantic}.warning.onBackground"),
        ("color-on-warning-fill", f"{semantic}.warning.onBackground"),
        ("color-warning-soft", f"{semantic}.warning.soft"),
        ("color-assistive", f"{semantic}.assistive.foreground"),
        ("color-assistive-fill", f"{semantic}.assistive.background"),
        ("color-on-assistive", f"{semantic}.assistive.onBackground"),
        ("color-on-assistive-fill", f"{semantic}.assistive.onBackground"),
        ("color-assistive-soft", f"{semantic}.assistive.soft"),
        ("color-purple", f"{semantic}.assistive.foreground"),
        ("color-purple-soft", f"{semantic}.assistive.soft"),
        ("color-timecode", f"{semantic}.timecode.foreground"),
        ("color-timecode-fill", f"{semantic}.timecode.background"),
        ("color-on-timecode", f"{semantic}.timecode.onBackground"),
        ("color-on-timecode-fill", f"{semantic}.timecode.onBackground"),
        ("color-timecode-soft", f"{semantic}.timecode.soft"),
        ("button-primary-background", f"{component}.button.primary.background"),
        ("button-primary-foreground", f"{component}.button.primary.foreground"),
        ("button-primary-hover", f"{component}.button.primary.hover"),
        ("button-primary-active", f"{component}.button.primary.active"),
        ("button-success-background", f"{component}.button.success.background"),
        ("button-success-foreground", f"{component}.button.success.foreground"),
        ("button-success-hover", f"{component}.button.success.hover"),
        ("button-success-active", f"{component}.button.success.active"),
        ("button-danger-background", f"{component}.button.danger.background"),
        ("button-danger-foreground", f"{component}.button.danger.foreground"),
        ("button-danger-hover", f"{component}.button.danger.hover"),
        ("button-danger-active", f"{component}.button.danger.active"),
        ("button-secondary-background", f"{component}.button.secondary.background"),
        ("button-secondary-foreground", f"{component}.button.secondary.foreground"),
        ("button-secondary-hover", f"{component}.button.secondary.hover"),
        ("button-assistive-background", f"{component}.button.assistive.background"),
        ("button-assistive-foreground", f"{component}.button.assistive.foreground"),
        ("button-timecode-background", f"{component}.button.timecode.background"),
        ("button-timecode-foreground", f"{component}.button.timecode.foreground"),
        ("field-background", f"{component}.field.background"),
        ("field-foreground", f"{component}.field.foreground"),
        ("field-placeholder", f"{component}.field.placeholder"),
        ("field-border", f"{component}.field.border"),
        ("field-focus", f"{component}.field.focus"),
        ("card-background", f"{component}.card.background"),
        ("card-raised", f"{component}.card.raised"),
        ("card-border", f"{component}.card.border"),
        ("dialog-scrim", f"{component}.dialog.backdrop"),
        ("dialog-background", f"{component}.dialog.surface"),
        ("dialog-foreground", f"{component}.dialog.foreground"),
        ("dialog-border", f"{semantic}.border.subtle"),
        ("toast-background", f"{component}.toast.neutral"),
        ("toast-success-background", f"{component}.toast.success"),
        ("toast-danger-background", f"{component}.toast.danger"),
        ("toast-foreground", f"{component}.toast.foreground"),
        ("toast-border", f"{semantic}.border.subtle"),
        ("progress-track", f"{component}.progress.track"),
        ("progress-fill", f"{component}.progress.fill"),
        ("progress-foreground", f"{component}.progress.foreground"),
        ("shadow-accent", f"{shadow}.raised"),
        ("shadow-success", f"{shadow}.raised"),
        ("shadow-toast", f"{shadow}.overlay"),
        ("dialog-shadow", f"{shadow}.overlay"),
        ("toast-shadow", f"{shadow}.overlay"),
    )


def render_css(document: dict[str, Any], resolver: Resolver) -> str:
    metadata = document["$extensions"]["com.dhad"]
    lines = [
        f"/* Generated from assets/tokens/dhad.tokens.json for {metadata['name']} {metadata['version']}.",
        "   Do not edit this file directly. Host identity and locale direction take precedence. */",
        "",
        ":root {",
    ]
    for name, path in GLOBAL_CSS.items():
        lines.append(f"  --dhad-{name}: {css_value(resolver.resolve(path), resolver.type_of(path))};")

    for role in ("micro", "caption", "label", "body", "bodyStrong", "title", "heading", "display", "timecode"):
        typography = resolver.resolve(f"semantic.typography.{role}")
        css_role = re.sub(r"(?<!^)(?=[A-Z])", "-", role).lower()
        lines.extend(
            [
                f"  --dhad-type-{css_role}-font-family: {css_font_family(typography['fontFamily'])};",
                f"  --dhad-type-{css_role}-font-size: {typography['fontSize']};",
                f"  --dhad-type-{css_role}-font-weight: {typography['fontWeight']};",
                f"  --dhad-type-{css_role}-line-height: {typography['lineHeight']};",
            ]
        )
    lines.append("}")

    for theme in ("dark", "light"):
        selector = '[data-dhad-theme="dark"]' if theme == "dark" else ':root,\n[data-dhad-theme="light"]'
        lines.extend(["", f"{selector} {{", f"  color-scheme: {theme};"])
        for name, path in theme_css_map(theme).items():
            lines.append(f"  --dhad-{name}: {css_value(resolver.resolve(path), resolver.type_of(path))};")
        lines.append("}")

    lines.extend(["", "@media (prefers-color-scheme: dark) {", "  :root:not([data-dhad-theme]),", '  [data-dhad-theme="auto"] {', "    color-scheme: dark;"])
    for name, path in theme_css_map("dark").items():
        lines.append(f"    --dhad-{name}: {css_value(resolver.resolve(path), resolver.type_of(path))};")
    lines.extend(["  }", "}"])

    lines.extend(
        [
            "",
            "@media (prefers-reduced-motion: reduce) {",
            "  :root {",
            "    --dhad-duration-fast: 0ms;",
            "    --dhad-duration-base: 0ms;",
            "    --dhad-duration-enter: 0ms;",
            "    --dhad-duration-sheet: 0ms;",
            "    --dhad-duration-slow: 0ms;",
            "    --dhad-duration-progress: 0ms;",
            "  }",
            "}",
            "",
        ]
    )
    return "\n".join(lines)


NATIVE_COLOR_MAP = path_map(
    ("background", "semantic.color.{theme}.background.canvas"),
    ("topbar", "semantic.color.{theme}.background.topbar"),
    ("backdrop", "semantic.color.{theme}.background.backdrop"),
    ("surfaceBase", "semantic.color.{theme}.surface.base"),
    ("surfaceRaised", "semantic.color.{theme}.surface.raised"),
    ("surfaceOverlay", "semantic.color.{theme}.surface.overlay"),
    ("input", "semantic.color.{theme}.surface.input"),
    ("hover", "semantic.color.{theme}.surface.hover"),
    ("border", "semantic.color.{theme}.border.subtle"),
    ("borderStrong", "semantic.color.{theme}.border.strong"),
    ("focus", "semantic.color.{theme}.border.focus"),
    ("textPrimary", "semantic.color.{theme}.text.primary"),
    ("textSecondary", "semantic.color.{theme}.text.secondary"),
    ("textTertiary", "semantic.color.{theme}.text.tertiary"),
    ("textDisabled", "semantic.color.{theme}.text.disabled"),
    ("actionText", "semantic.color.{theme}.action.foreground"),
    ("action", "semantic.color.{theme}.action.background"),
    ("onAction", "semantic.color.{theme}.action.onBackground"),
    ("actionHover", "semantic.color.{theme}.action.hover"),
    ("actionActive", "semantic.color.{theme}.action.active"),
    ("actionSoft", "semantic.color.{theme}.action.soft"),
    ("successText", "semantic.color.{theme}.success.foreground"),
    ("success", "semantic.color.{theme}.success.background"),
    ("onSuccess", "semantic.color.{theme}.success.onBackground"),
    ("successSoft", "semantic.color.{theme}.success.soft"),
    ("dangerText", "semantic.color.{theme}.danger.foreground"),
    ("danger", "semantic.color.{theme}.danger.background"),
    ("onDanger", "semantic.color.{theme}.danger.onBackground"),
    ("dangerSoft", "semantic.color.{theme}.danger.soft"),
    ("warningText", "semantic.color.{theme}.warning.foreground"),
    ("warning", "semantic.color.{theme}.warning.background"),
    ("onWarning", "semantic.color.{theme}.warning.onBackground"),
    ("warningSoft", "semantic.color.{theme}.warning.soft"),
    ("assistiveText", "semantic.color.{theme}.assistive.foreground"),
    ("assistive", "semantic.color.{theme}.assistive.background"),
    ("onAssistive", "semantic.color.{theme}.assistive.onBackground"),
    ("assistiveSoft", "semantic.color.{theme}.assistive.soft"),
    ("timecodeText", "semantic.color.{theme}.timecode.foreground"),
    ("timecode", "semantic.color.{theme}.timecode.background"),
    ("onTimecode", "semantic.color.{theme}.timecode.onBackground"),
    ("timecodeSoft", "semantic.color.{theme}.timecode.soft"),
    ("buttonPrimaryBackground", "component.color.{theme}.button.primary.background"),
    ("buttonPrimaryForeground", "component.color.{theme}.button.primary.foreground"),
    ("buttonDangerBackground", "component.color.{theme}.button.danger.background"),
    ("buttonDangerForeground", "component.color.{theme}.button.danger.foreground"),
    ("fieldBackground", "component.color.{theme}.field.background"),
    ("fieldForeground", "component.color.{theme}.field.foreground"),
    ("fieldBorder", "component.color.{theme}.field.border"),
    ("cardBackground", "component.color.{theme}.card.background"),
    ("cardBorder", "component.color.{theme}.card.border"),
    ("dialogBackdrop", "component.color.{theme}.dialog.backdrop"),
    ("dialogSurface", "component.color.{theme}.dialog.surface"),
)


def number_from_unit(value: str) -> float | int:
    match = re.match(r"^-?(?:\d+\.?\d*|\.\d+)", value)
    if not match:
        raise ValueError(f"Expected numeric unit value, got {value}")
    number = float(match.group(0))
    return int(number) if number.is_integer() else number


def resolved_group(resolver: Resolver, prefix: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for path in sorted(resolver.nodes):
        if not path.startswith(prefix + "."):
            continue
        relative = path[len(prefix) + 1 :].split(".")
        target = result
        for part in relative[:-1]:
            target = target.setdefault(part, {})
        target[relative[-1]] = resolver.resolve(path)
    return result


def native_payload(document: dict[str, Any], resolver: Resolver) -> dict[str, Any]:
    colors = {
        theme: {name: resolver.resolve(path.format(theme=theme)) for name, path in NATIVE_COLOR_MAP.items()}
        for theme in ("dark", "light")
    }
    payload = {
        "meta": document["$extensions"]["com.dhad"],
        "themes": colors,
        "typography": resolved_group(resolver, "semantic.typography"),
        "space": {name: number_from_unit(resolver.resolve(f"semantic.space.{name}")) for name in map(str, range(9))},
        "radius": {name: number_from_unit(resolver.resolve(f"semantic.radius.{name}")) for name in ("xs", "sm", "md", "lg", "xl", "round")},
        "size": {name: number_from_unit(resolver.resolve(f"semantic.size.{name}")) for name in ("touch", "touchAndroid", "topbar", "content", "project", "reading")},
        "density": {
            mode: {
                key: number_from_unit(resolver.resolve(f"semantic.density.{mode}.{key}"))
                for key in ("controlHeight", "hitTarget", "inlineGap", "sectionGap")
            }
            for mode in ("comfortable", "compact")
        },
        "breakpoint": {name: number_from_unit(resolver.resolve(f"semantic.breakpoint.{name}")) for name in ("small", "mobile", "tablet", "content", "wide")},
        "focus": {name: number_from_unit(resolver.resolve(f"semantic.focus.{name}")) for name in ("width", "offset")},
        "motion": {
            "durationMs": {name: number_from_unit(resolver.resolve(f"semantic.motion.duration.{name}")) for name in ("instant", "fast", "base", "enter", "sheet", "slow", "progress")},
            "easing": {name: resolver.resolve(f"semantic.motion.easing.{name}") for name in ("standard", "expo", "quart", "quint", "exit")},
        },
        "zIndex": {name: resolver.resolve(f"semantic.zIndex.{name}") for name in ("content", "sticky", "topbar", "menu", "modal", "sheet", "toast")},
        "shadow": {
            theme: {name: resolver.resolve(f"semantic.shadow.{theme}.{name}") for name in ("raised", "overlay")}
            for theme in ("dark", "light")
        },
        "component": {
            "button": {name: number_from_unit(resolver.resolve(f"component.dimension.button.{name}")) for name in ("minHeight", "compactHeight", "hitTarget", "radius", "paddingInline", "gap")},
            "field": {name: number_from_unit(resolver.resolve(f"component.dimension.field.{name}")) for name in ("minHeight", "radius", "paddingInline", "paddingBlock")},
            "card": {name: number_from_unit(resolver.resolve(f"component.dimension.card.{name}")) for name in ("radius", "projectRadius", "padding", "projectPadding")},
            "dialog": {name: number_from_unit(resolver.resolve(f"component.dimension.dialog.{name}")) for name in ("radius", "sheetRadius", "maxWidth", "padding")},
        },
    }
    return payload


def render_react_native(document: dict[str, Any], resolver: Resolver) -> str:
    payload = native_payload(document, resolver)
    font_families = {
        "sans": resolver.resolve("primitive.font.family.sans")[0],
        "display": resolver.resolve("primitive.font.family.display")[0],
        "fallback": "system",
        "mono": resolver.resolve("primitive.font.family.mono")[0],
    }
    for role in payload["typography"].values():
        role["fontFamily"] = role["fontFamily"][0]
        role["fontWeight"] = str(role["fontWeight"])
        role["fontSize"] = number_from_unit(role["fontSize"])
    data = json.dumps(payload, ensure_ascii=False, indent=2)
    return "\n".join(
        [
            "// Generated from dhad.tokens.json. Do not edit directly.",
            "// Host typography takes precedence; map these roles to the product font.",
            "",
            f"export const dhadFontFamilies = {json.dumps(font_families, ensure_ascii=False, indent=2)} as const;",
            "",
            f"export const dhad = {data} as const;",
            "",
            "export type DhadThemeName = keyof typeof dhad.themes;",
            "export type DhadTheme = (typeof dhad.themes)[DhadThemeName];",
            "",
            "export function dhadTheme(name: DhadThemeName): DhadTheme {",
            "  return dhad.themes[name];",
            "}",
            "",
        ]
    )


def color_channels(value: str) -> tuple[int, int, int, int]:
    red, green, blue, alpha = parse_color(value)
    return tuple(round(channel * 255) for channel in (alpha, red, green, blue))  # type: ignore[return-value]


def dart_color(value: str) -> str:
    alpha, red, green, blue = color_channels(value)
    return f"Color(0x{alpha:02X}{red:02X}{green:02X}{blue:02X})"


def swift_color(value: str) -> str:
    alpha, red, green, blue = color_channels(value)
    return f"Color(.sRGB, red: {red / 255:.4f}, green: {green / 255:.4f}, blue: {blue / 255:.4f}, opacity: {alpha / 255:.4f})"


def compose_color(value: str) -> str:
    alpha, red, green, blue = color_channels(value)
    return f"Color(0x{alpha:02X}{red:02X}{green:02X}{blue:02X})"


def decimal_literal(value: float | int) -> str:
    number = float(value)
    return f"{int(number)}.0" if number.is_integer() else format(number, "g")


def shadow_value(resolver: Resolver, theme: str, name: str) -> dict[str, str]:
    return resolver.resolve(f"semantic.shadow.{theme}.{name}")


def render_flutter(document: dict[str, Any], resolver: Resolver) -> str:
    fields = list(NATIVE_COLOR_MAP)
    lines = [
        "// Generated from dhad.tokens.json. Do not edit directly.",
        "// Host typography takes precedence; map these roles to the product font.",
        "import 'package:flutter/material.dart';",
        "",
        "@immutable",
        "class DhadColorTokens {",
        "  const DhadColorTokens({",
        *[f"    required this.{field}," for field in fields],
        "  });",
        "",
        *[f"  final Color {field};" for field in fields],
        "}",
        "",
        "abstract final class DhadThemes {",
    ]
    for theme in ("dark", "light"):
        lines.extend([f"  static const {theme} = DhadColorTokens("])
        for field, path in NATIVE_COLOR_MAP.items():
            lines.append(f"    {field}: {dart_color(resolver.resolve(path.format(theme=theme)))},")
        lines.append("  );")
    lines.extend(["}", "", "abstract final class DhadSpace {"])
    for name in map(str, range(9)):
        lines.append(f"  static const s{name} = {number_from_unit(resolver.resolve(f'semantic.space.{name}'))}.0;")
    lines.extend(["}", "", "abstract final class DhadRadius {"])
    for name in ("xs", "sm", "md", "lg", "xl", "round"):
        lines.append(f"  static const {name} = {number_from_unit(resolver.resolve(f'semantic.radius.{name}'))}.0;")
    lines.extend(["}", "", "abstract final class DhadSize {"])
    for name in ("touch", "touchAndroid", "topbar", "content", "project", "reading"):
        lines.append(f"  static const {name} = {decimal_literal(number_from_unit(resolver.resolve(f'semantic.size.{name}')))};")
    lines.extend(["}", "", "abstract final class DhadDensity {"])
    for mode in ("comfortable", "compact"):
        for name in ("controlHeight", "hitTarget", "inlineGap", "sectionGap"):
            value = number_from_unit(resolver.resolve(f"semantic.density.{mode}.{name}"))
            lines.append(f"  static const {mode}{name[0].upper() + name[1:]} = {decimal_literal(value)};")
    lines.extend(["}", "", "abstract final class DhadBreakpoint {"])
    for name in ("small", "mobile", "tablet", "content", "wide"):
        value = number_from_unit(resolver.resolve(f"semantic.breakpoint.{name}"))
        lines.append(f"  static const {name} = {decimal_literal(value)};")
    lines.extend(["}", "", "abstract final class DhadFocus {"])
    for name in ("width", "offset"):
        value = number_from_unit(resolver.resolve(f"semantic.focus.{name}"))
        lines.append(f"  static const {name} = {decimal_literal(value)};")
    lines.extend(
        [
            "}",
            "",
            "abstract final class DhadTypography {",
            f"  static const sans = {json.dumps(resolver.resolve('primitive.font.family.sans')[0])};",
            f"  static const display = {json.dumps(resolver.resolve('primitive.font.family.display')[0])};",
            '  static const fallback = "system";',
            f"  static const mono = {json.dumps(resolver.resolve('primitive.font.family.mono')[0])};",
            "  static const light = FontWeight.w300;",
            "  static const regular = FontWeight.w400;",
            "  static const medium = FontWeight.w500;",
            "  static const bold = FontWeight.w700;",
            "  static const black = FontWeight.w900;",
        ]
    )
    for name in ("100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"):
        value = number_from_unit(resolver.resolve(f"primitive.font.size.{name}"))
        identifier = f"size{name[0].upper() + name[1:]}" if not name.isdigit() else f"size{name}"
        lines.append(f"  static const {identifier} = {decimal_literal(value)};")
    for name in ("tight", "heading", "body", "reading"):
        value = resolver.resolve(f"primitive.font.lineHeight.{name}")
        lines.append(f"  static const line{name[0].upper() + name[1:]} = {decimal_literal(value)};")
    lines.extend(["}", "", "abstract final class DhadMotion {"])
    for name in ("instant", "fast", "base", "enter", "sheet", "slow", "progress"):
        value = number_from_unit(resolver.resolve(f"semantic.motion.duration.{name}"))
        lines.append(f"  static const {name} = Duration(milliseconds: {value});")
    lines.extend(["}", "", "abstract final class DhadZIndex {"])
    for name in ("content", "sticky", "topbar", "menu", "modal", "sheet", "toast"):
        lines.append(f"  static const {name} = {resolver.resolve(f'semantic.zIndex.{name}')};")
    lines.extend(["}", "", "@immutable", "class DhadShadowTokens {", "  const DhadShadowTokens({required this.raised, required this.overlay});", "  final BoxShadow raised;", "  final BoxShadow overlay;", "}", "", "abstract final class DhadShadows {"])
    for theme in ("dark", "light"):
        lines.append(f"  static const {theme} = DhadShadowTokens(")
        for name in ("raised", "overlay"):
            value = shadow_value(resolver, theme, name)
            x = decimal_literal(number_from_unit(value["offsetX"]))
            y = decimal_literal(number_from_unit(value["offsetY"]))
            blur = decimal_literal(number_from_unit(value["blur"]))
            spread = decimal_literal(number_from_unit(value["spread"]))
            lines.append(f"    {name}: BoxShadow(color: {dart_color(value['color'])}, offset: Offset({x}, {y}), blurRadius: {blur}, spreadRadius: {spread}),")
        lines.append("  );")
    lines.extend(["}", "", "abstract final class DhadComponentSize {"])
    for group, names in {
        "button": ("minHeight", "compactHeight", "hitTarget", "radius", "paddingInline", "gap"),
        "field": ("minHeight", "radius", "paddingInline", "paddingBlock"),
        "card": ("radius", "projectRadius", "padding", "projectPadding"),
        "dialog": ("radius", "sheetRadius", "maxWidth", "padding"),
    }.items():
        for name in names:
            value = number_from_unit(resolver.resolve(f"component.dimension.{group}.{name}"))
            identifier = group + name[0].upper() + name[1:]
            lines.append(f"  static const {identifier} = {decimal_literal(value)};")
    lines.extend(["}", ""])
    return "\n".join(lines)


def render_swiftui(document: dict[str, Any], resolver: Resolver) -> str:
    fields = list(NATIVE_COLOR_MAP)
    lines = [
        "// Generated from dhad.tokens.json. Do not edit directly.",
        "// Host typography takes precedence; map these roles to the product font.",
        "import SwiftUI",
        "",
        "struct DhadColorTokens {",
        *[f"    let {field}: Color" for field in fields],
        "}",
        "",
        "enum DhadThemes {",
    ]
    for theme in ("dark", "light"):
        lines.append(f"    static let {theme} = DhadColorTokens(")
        for index, (field, path) in enumerate(NATIVE_COLOR_MAP.items()):
            comma = "," if index < len(NATIVE_COLOR_MAP) - 1 else ""
            lines.append(f"        {field}: {swift_color(resolver.resolve(path.format(theme=theme)))}{comma}")
        lines.append("    )")
    lines.extend(["}", "", "enum DhadSpace {"])
    for name in map(str, range(9)):
        lines.append(f"    static let s{name}: CGFloat = {number_from_unit(resolver.resolve(f'semantic.space.{name}'))}")
    lines.extend(["}", "", "enum DhadRadius {"])
    for name in ("xs", "sm", "md", "lg", "xl", "round"):
        lines.append(f"    static let {name}: CGFloat = {number_from_unit(resolver.resolve(f'semantic.radius.{name}'))}")
    lines.extend(["}", "", "enum DhadSize {"])
    for name in ("touch", "touchAndroid", "topbar", "content", "project", "reading"):
        lines.append(f"    static let {name}: CGFloat = {number_from_unit(resolver.resolve(f'semantic.size.{name}'))}")
    lines.extend(["}", "", "enum DhadDensity {"])
    for mode in ("comfortable", "compact"):
        for name in ("controlHeight", "hitTarget", "inlineGap", "sectionGap"):
            value = number_from_unit(resolver.resolve(f"semantic.density.{mode}.{name}"))
            lines.append(f"    static let {mode}{name[0].upper() + name[1:]}: CGFloat = {value}")
    lines.extend(["}", "", "enum DhadBreakpoint {"])
    for name in ("small", "mobile", "tablet", "content", "wide"):
        value = number_from_unit(resolver.resolve(f"semantic.breakpoint.{name}"))
        lines.append(f"    static let {name}: CGFloat = {value}")
    lines.extend(["}", "", "enum DhadFocus {"])
    for name in ("width", "offset"):
        value = number_from_unit(resolver.resolve(f"semantic.focus.{name}"))
        lines.append(f"    static let {name}: CGFloat = {value}")
    lines.extend(
        [
            "}",
            "",
            "enum DhadTypography {",
            f"    static let sans = {json.dumps(resolver.resolve('primitive.font.family.sans')[0])}",
            f"    static let display = {json.dumps(resolver.resolve('primitive.font.family.display')[0])}",
            '    static let fallback = "system"',
            f"    static let mono = {json.dumps(resolver.resolve('primitive.font.family.mono')[0])}",
            "    static let light: Font.Weight = .light // 300",
            "    static let regular: Font.Weight = .regular // 400",
            "    static let medium: Font.Weight = .medium // 500",
            "    static let bold: Font.Weight = .bold // 700",
            "    static let black: Font.Weight = .black // 900",
        ]
    )
    for name in ("100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"):
        value = number_from_unit(resolver.resolve(f"primitive.font.size.{name}"))
        identifier = f"size{name[0].upper() + name[1:]}" if not name.isdigit() else f"size{name}"
        lines.append(f"    static let {identifier}: CGFloat = {value}")
    for name in ("tight", "heading", "body", "reading"):
        value = resolver.resolve(f"primitive.font.lineHeight.{name}")
        lines.append(f"    static let line{name[0].upper() + name[1:]}: CGFloat = {value}")
    lines.extend(["}", "", "enum DhadMotion {"])
    for name in ("instant", "fast", "base", "enter", "sheet", "slow", "progress"):
        milliseconds = number_from_unit(resolver.resolve(f"semantic.motion.duration.{name}"))
        lines.append(f"    static let {name}: Double = {milliseconds / 1000:g}")
    lines.extend(["}", "", "enum DhadZIndex {"])
    for name in ("content", "sticky", "topbar", "menu", "modal", "sheet", "toast"):
        lines.append(f"    static let {name}: Double = {resolver.resolve(f'semantic.zIndex.{name}')}")
    lines.extend(["}", "", "struct DhadShadowToken {", "    let color: Color", "    let offset: CGSize", "    let blur: CGFloat", "    let spread: CGFloat", "}", "", "enum DhadShadows {"])
    for theme in ("dark", "light"):
        for name in ("raised", "overlay"):
            value = shadow_value(resolver, theme, name)
            identifier = theme + name[0].upper() + name[1:]
            x = number_from_unit(value["offsetX"])
            y = number_from_unit(value["offsetY"])
            blur = number_from_unit(value["blur"])
            spread = number_from_unit(value["spread"])
            lines.append(f"    static let {identifier} = DhadShadowToken(color: {swift_color(value['color'])}, offset: CGSize(width: {x}, height: {y}), blur: {blur}, spread: {spread})")
    lines.extend(["}", "", "enum DhadComponentSize {"])
    for group, names in {
        "button": ("minHeight", "compactHeight", "hitTarget", "radius", "paddingInline", "gap"),
        "field": ("minHeight", "radius", "paddingInline", "paddingBlock"),
        "card": ("radius", "projectRadius", "padding", "projectPadding"),
        "dialog": ("radius", "sheetRadius", "maxWidth", "padding"),
    }.items():
        for name in names:
            value = number_from_unit(resolver.resolve(f"component.dimension.{group}.{name}"))
            identifier = group + name[0].upper() + name[1:]
            lines.append(f"    static let {identifier}: CGFloat = {value}")
    lines.extend(["}", ""])
    return "\n".join(lines)


def render_compose(document: dict[str, Any], resolver: Resolver) -> str:
    fields = list(NATIVE_COLOR_MAP)
    lines = [
        "// Generated from dhad.tokens.json. Do not edit directly.",
        "// Host typography takes precedence; map these roles to the product font.",
        "package com.dhad.design",
        "",
        "import androidx.compose.ui.graphics.Color",
        "import androidx.compose.ui.unit.dp",
        "import androidx.compose.ui.unit.sp",
        "",
        "data class DhadColorTokens(",
        *[f"    val {field}: Color{',' if index < len(fields) - 1 else ''}" for index, field in enumerate(fields)],
        ")",
        "",
        "object DhadThemes {",
    ]
    for theme in ("dark", "light"):
        lines.append(f"    val {theme} = DhadColorTokens(")
        for index, (field, path) in enumerate(NATIVE_COLOR_MAP.items()):
            comma = "," if index < len(NATIVE_COLOR_MAP) - 1 else ""
            lines.append(f"        {field} = {compose_color(resolver.resolve(path.format(theme=theme)))}{comma}")
        lines.append("    )")
    lines.extend(["}", "", "object DhadSpace {"])
    for name in map(str, range(9)):
        lines.append(f"    val s{name} = {number_from_unit(resolver.resolve(f'semantic.space.{name}'))}.dp")
    lines.extend(["}", "", "object DhadRadius {"])
    for name in ("xs", "sm", "md", "lg", "xl", "round"):
        lines.append(f"    val {name} = {number_from_unit(resolver.resolve(f'semantic.radius.{name}'))}.dp")
    lines.extend(["}", "", "object DhadSize {"])
    for name in ("touch", "touchAndroid", "topbar", "content", "project", "reading"):
        lines.append(f"    val {name} = {number_from_unit(resolver.resolve(f'semantic.size.{name}'))}.dp")
    lines.extend(["}", "", "object DhadDensity {"])
    for mode in ("comfortable", "compact"):
        for name in ("controlHeight", "hitTarget", "inlineGap", "sectionGap"):
            value = number_from_unit(resolver.resolve(f"semantic.density.{mode}.{name}"))
            lines.append(f"    val {mode}{name[0].upper() + name[1:]} = {value}.dp")
    lines.extend(["}", "", "object DhadBreakpoint {"])
    for name in ("small", "mobile", "tablet", "content", "wide"):
        value = number_from_unit(resolver.resolve(f"semantic.breakpoint.{name}"))
        lines.append(f"    val {name} = {value}.dp")
    lines.extend(["}", "", "object DhadFocus {"])
    for name in ("width", "offset"):
        value = number_from_unit(resolver.resolve(f"semantic.focus.{name}"))
        lines.append(f"    val {name} = {value}.dp")
    lines.extend(
        [
            "}",
            "",
            "object DhadTypography {",
            f"    const val Sans = {json.dumps(resolver.resolve('primitive.font.family.sans')[0])}",
            f"    const val Display = {json.dumps(resolver.resolve('primitive.font.family.display')[0])}",
            '    const val Fallback = "system"',
            f"    const val Mono = {json.dumps(resolver.resolve('primitive.font.family.mono')[0])}",
            "    const val Light = 300",
            "    const val Regular = 400",
            "    const val Medium = 500",
            "    const val Bold = 700",
            "    const val Black = 900",
        ]
    )
    for name in ("100", "200", "300", "400", "500", "600", "700", "800", "900", "1000"):
        value = number_from_unit(resolver.resolve(f"primitive.font.size.{name}"))
        identifier = f"Size{name[0].upper() + name[1:]}" if not name.isdigit() else f"Size{name}"
        lines.append(f"    val {identifier} = {value}.sp")
    for name in ("tight", "heading", "body", "reading"):
        value = resolver.resolve(f"primitive.font.lineHeight.{name}")
        lines.append(f"    const val Line{name[0].upper() + name[1:]} = {decimal_literal(value)}f")
    lines.extend(["}", "", "object DhadMotion {"])
    for name in ("instant", "fast", "base", "enter", "sheet", "slow", "progress"):
        milliseconds = number_from_unit(resolver.resolve(f"semantic.motion.duration.{name}"))
        lines.append(f"    const val {name}Ms = {milliseconds}")
    lines.extend(["}", "", "object DhadZIndex {"])
    for name in ("content", "sticky", "topbar", "menu", "modal", "sheet", "toast"):
        lines.append(f"    const val {name} = {resolver.resolve(f'semantic.zIndex.{name}')}")
    lines.extend(["}", "", "data class DhadShadowToken(", "    val color: Color,", "    val offsetX: androidx.compose.ui.unit.Dp,", "    val offsetY: androidx.compose.ui.unit.Dp,", "    val blur: androidx.compose.ui.unit.Dp,", "    val spread: androidx.compose.ui.unit.Dp", ")", "", "object DhadShadows {"])
    for theme in ("dark", "light"):
        for name in ("raised", "overlay"):
            value = shadow_value(resolver, theme, name)
            identifier = theme + name[0].upper() + name[1:]
            x = number_from_unit(value["offsetX"])
            y = number_from_unit(value["offsetY"])
            blur = number_from_unit(value["blur"])
            spread = number_from_unit(value["spread"])
            lines.append(f"    val {identifier} = DhadShadowToken({compose_color(value['color'])}, {x}.dp, {y}.dp, {blur}.dp, {spread}.dp)")
    lines.extend(["}", "", "object DhadComponentSize {"])
    for group, names in {
        "button": ("minHeight", "compactHeight", "hitTarget", "radius", "paddingInline", "gap"),
        "field": ("minHeight", "radius", "paddingInline", "paddingBlock"),
        "card": ("radius", "projectRadius", "padding", "projectPadding"),
        "dialog": ("radius", "sheetRadius", "maxWidth", "padding"),
    }.items():
        for name in names:
            value = number_from_unit(resolver.resolve(f"component.dimension.{group}.{name}"))
            identifier = group + name[0].upper() + name[1:]
            lines.append(f"    val {identifier} = {value}.dp")
    lines.extend(["}", ""])
    return "\n".join(lines)


def generated_outputs(document: dict[str, Any], resolver: Resolver) -> dict[str, str]:
    return {
        "css": render_css(document, resolver),
        "react_native": render_react_native(document, resolver),
        "flutter": render_flutter(document, resolver),
        "swiftui": render_swiftui(document, resolver),
        "compose": render_compose(document, resolver),
    }


def validate_output(name: str, content: str) -> list[str]:
    errors: list[str] = []
    required = {
        "css": ("--dhad-color-bg", "--dhad-color-on-action", "--dhad-button-primary-background", "--dhad-size-touch", "[data-dhad-theme=\"light\"]"),
        "react_native": ("export const dhad", "onAction", "touchAndroid", '"density"', '"breakpoint"', '"focus"', '"shadow"'),
        "flutter": ("class DhadColorTokens", "onAction", "DhadTypography", "DhadDensity", "DhadBreakpoint", "DhadFocus", "DhadShadows", "DhadComponentSize"),
        "swiftui": ("struct DhadColorTokens", "onAction", "DhadTypography", "DhadDensity", "DhadBreakpoint", "DhadFocus", "DhadShadows", "DhadComponentSize"),
        "compose": ("data class DhadColorTokens", "onAction", "DhadTypography", "DhadDensity", "DhadBreakpoint", "DhadFocus", "DhadShadows", "DhadComponentSize"),
    }
    for marker in required[name]:
        if marker not in content:
            errors.append(f"{name}: generated output is missing {marker}")
    forbidden = ("--an-", "data-an-theme")
    for marker in forbidden:
        if marker in content:
            errors.append(f"{name}: generated output contains legacy marker {marker}")
    if content.count("{") != content.count("}"):
        errors.append(f"{name}: unbalanced braces")
    if not content.endswith("\n"):
        errors.append(f"{name}: output must end with a newline")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail when generated files differ from the canonical source")
    parser.add_argument("--validate-only", action="store_true", help="Validate tokens without writing generated files")
    args = parser.parse_args()

    document = json.loads(SOURCE.read_text(encoding="utf-8"))
    resolver = Resolver(document)
    errors = validate(document, resolver)
    if errors:
        print("Token validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    if args.validate_only:
        print(f"Validated {len(resolver.nodes)} tokens from {SOURCE.relative_to(REPO_ROOT)}")
        return 0

    outputs = generated_outputs(document, resolver)
    for name, content in outputs.items():
        errors.extend(validate_output(name, content))
    if errors:
        print("Generated output validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    stale: list[Path] = []
    for name, output_path in OUTPUTS.items():
        content = outputs[name]
        if args.check:
            if not output_path.exists() or output_path.read_text(encoding="utf-8") != content:
                stale.append(output_path)
            continue
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding="utf-8")
        print(f"Generated {output_path.relative_to(REPO_ROOT)}")

    if stale:
        print("Generated token outputs are stale:", file=sys.stderr)
        for path in stale:
            print(f"- {path.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 1
    if args.check:
        print(f"Token outputs are current ({len(outputs)} files, {len(resolver.nodes)} tokens)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
