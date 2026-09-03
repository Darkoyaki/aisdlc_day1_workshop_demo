# Snip design language

Borrowed look-and-feel from lovable.dev (dark, gradient-glow, chat-centric) —
**never** their logo, name, or copy. This file is the source of truth: paste it
into any future styling prompt instead of re-describing the aesthetic.

## Color tokens

| Token          | Value                                              | Use |
|----------------|-----------------------------------------------------|-----|
| `--bg`         | `#0a0a0c`                                           | Page background (near-black) |
| `--bg-glow`    | `radial-gradient(60% 50% at 50% 0%, rgba(255,111,97,0.35), rgba(255,158,97,0.18) 35%, transparent 70%)` | Soft warm glow behind the hero |
| `--surface`    | `#151518`                                           | Card / table surface |
| `--surface-2`  | `#1c1c21`                                           | Input background |
| `--border`     | `rgba(255,255,255,0.08)`                            | Subtle borders on cards/inputs |
| `--text`       | `#f5f5f7`                                           | Primary text |
| `--text-muted` | `#9a9aa2`                                           | Subline, hints, empty states |
| `--accent-from`| `#ff6f61`                                           | Gradient start (coral) |
| `--accent-via` | `#ff8fa3`                                           | Gradient mid (pink) |
| `--accent-to`  | `#ff9e61`                                           | Gradient end (orange) |
| `--accent-grad`| `linear-gradient(90deg, var(--accent-from), var(--accent-via), var(--accent-to))` | Primary action, links, focus ring |
| `--success`    | `#34d399` on `rgba(52,211,153,0.12)`                | Success notice |
| `--error`      | `#f87171` on `rgba(248,113,113,0.12)`                | Error notice |

## Type

- Stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif`
- Scale: hero `2.75rem/1.1`, subline `1.05rem/1.5`, body `0.95rem/1.5`,
  table header `0.8rem` uppercase tracked, small print `0.8rem`
- Weight: hero `700`, subline `400` muted, body `400–500`

## Spacing, radii, elevation

- Spacing scale: `0.5rem 0.75rem 1rem 1.5rem 2rem 3rem`
- Radii: pill inputs/buttons `999px`, cards `1.25rem`, small chips `0.5rem`
- Borders: `1px solid var(--border)` on all surfaces
- Shadow: `0 20px 60px -20px rgba(255,111,97,0.25)` glow under the hero input;
  `0 1px 0 rgba(255,255,255,0.04) inset` hairline highlight on cards
- Breathing room: generous vertical rhythm — `3–4rem` between hero and content

## Mapping Snip → the system

| Snip element        | Design role |
|----------------------|-------------|
| Page header ("Snip" + subtitle) | The hero — centered, bold headline over a muted subline, sitting on the gradient glow |
| URL form              | The chat-style input — one large pill-rounded field with the primary action attached inline, glow shadow beneath it |
| Success notice (short link) | Small rounded chip below the input, success tokens |
| Error notice           | Small rounded chip below the input, error tokens |
| Links table            | A generously rounded card on a subtle border, rows separated by hairlines, muted empty state |
