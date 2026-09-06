# Dhad

Dhad makes digital products look Arabic and behave correctly in Arabic. It combines an RTL-first design system with pluralization, sorting, search, numerals, Hijri dates, and regional conventions across web, SaaS, mobile, and desktop.

It goes beyond mirroring a layout: Dhad reviews copy, data, states, and interaction, then adapts them to the product's identity without imposing one visual template.

[Live showcase](https://dhad.iiammar.com) · [العربية](README.md) · [License](LICENSE)

<p align="center">
  <img src="docs/images/readme/overview-dark.png" alt="Dhad dark-mode showcase" width="390">
  &nbsp;&nbsp;
  <img src="docs/images/readme/overview-light.png" alt="Dhad light-mode showcase" width="390">
</p>

## What it provides

- Arabic RTL interfaces with local LTR islands for URLs, code, and technical values.
- Dark and light themes built on reusable semantic tokens.
- Web components and states, plus native-platform theme starters.
- Product-aware copy and optional emoji instead of a fixed visual vocabulary.
- Accessibility, mobile, save, error, offline, and reconnecting guidance.

## Installation

One source produces two packages:

| Package | Platforms | Invocation |
|---|---|---|
| `Dhad-openai-plugin.zip` | ChatGPT and Codex | `@dhad` or `$dhad` |
| `Dhad-agent-skill.zip` | Claude Chat and Claude Code | automatic after activation or `/dhad` |

Build both packages from source:

```bash
python3 scripts/build_releases.py
```

Codex can also install the skill directly from this repository with `$skill-installer`.

## Fonts

Dhad ships with IBM Plex Sans Arabic (OFL-1.1) bundled - all eight weights, offline, no CDN.

[IBM Plex](https://github.com/IBM/plex)

## Open to everyone

Dhad is open source under the [MIT License](LICENSE). You can use it, adapt it, and build public or private products with it. Third-party rights and font licenses are listed in [NOTICE](NOTICE.md), and contributions are welcome through [CONTRIBUTING.md](CONTRIBUTING.md).

The correctness layer follows [Unicode CLDR/ICU](https://cldr.unicode.org) standards, and IBM Plex Sans Arabic is bundled under OFL-1.1.

## Contact

Dhad is developed and maintained by Ammar.

[GitHub](https://github.com/iiAMMAR11) · [X](https://x.com/iiAMMAR11) · [Hello@iiammar.com](mailto:Hello@iiammar.com) · [iiammar.com](https://iiammar.com)
