# Bundled fonts

All fonts are bundled so the editor and exported games work offline. No subsetting: every font covers all 11,172 Hangul syllables, so any user-authored Korean text renders with the intended face.

| File | Family in CSS | Used for | Source | License |
| --- | --- | --- | --- | --- |
| GowunBatang-Regular.woff2 | `StorySerif` | Story prose in serif themes | Google Fonts `ofl/gowunbatang/GowunBatang-Regular.ttf`, converted to WOFF2 with fontTools (no glyph changes) | SIL OFL 1.1 — GowunBatang-OFL.txt |
| PretendardVariable.woff2 | `ActionSans` (weights 100–900) | Choices, names, buttons, editor UI, prose in sans themes | npm `pretendard@1.3.9` `dist/web/variable/woff2/PretendardVariable.woff2`, unmodified | SIL OFL 1.1 — Pretendard-OFL.txt (Reserved Font Name: Pretendard) |
| Galmuri14.woff2 | `StoryPixel` | Retro game theme (designed for 15px) | npm `galmuri@2.40.3` `dist/Galmuri14.woff2`, unmodified | SIL OFL 1.1 — Galmuri-OFL.md |

Replaced in 0.1.24: NanumMyeongjo Regular (prose) and a Noto Sans KR Bold static instance (choices). The CSS family names `StorySerif` and `ActionSans` are kept so existing games and exports keep working.
