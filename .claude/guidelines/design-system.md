# Design System

Token, komponen, dan asset bersama untuk seluruh aplikasi. **Aturan inti:** semua warna,
spacing, tipografi, dan radius diambil dari **Tailwind v4 `@theme` token** di
[src/index.css](../../src/index.css) — bukan hardcode hex/px di komponen.

## Cara pakai

Token didefinisikan sebagai CSS variable dalam blok `@theme`, lalu dipakai lewat **utility
class Tailwind** yang namanya diturunkan dari variabel:

```tsx
// warna & font dari token
<div className="bg-primary text-on-primary font-display">…</div>
<span className="text-risk-extreme">Extreme</span>

// nilai dinamis (warna level dari data) — tetap via CSS variable, bukan hex liar
<div style={{ backgroundColor: "var(--color-risk-high)" }} />
```

Komponen primitif bersama ada di [src/components/ui.tsx](../../src/components/ui.tsx)
(`Card`, `Button`, `Icon`, `Pill`, `SectionTitle`, `EmptyState`). **Cek dulu** sebelum membuat
komponen baru.

---

## Tokens

> **Sumber kebenaran nilai: blok `@theme` di [src/index.css](../../src/index.css).** Tabel di
> bawah adalah ringkasan — saat menambah warna baru, tambahkan token di `index.css`, jangan
> tempel hex di komponen.

### Colors (brand & surface)

| Token (utility) | Nilai | Peran |
|---|---|---|
| `primary` | `#01362f` | warna brand utama (sidebar, tombol) |
| `on-primary` | `#ffffff` | teks di atas primary |
| `primary-container` | `#1f4d45` | varian primary lebih terang |
| `secondary-container` | `#fdcb57` | aksen kuning |
| `surface` | `#ffffff` | permukaan kartu |
| `surface-muted` | `#f4f8f6` | latar lembut / hover |
| `background-canvas` | `#a9cdc9` | latar terluar app |
| `on-surface` | `#0d1f1c` | teks utama |
| `text-secondary` | `#5f6f6b` | teks sekunder |
| `border-hairline` | `#dce6e2` | garis batas kartu |

### Colors (level risiko — semantik)

| Token | Nilai | Level |
|---|---|---|
| `risk-low` | `#3e9d7c` | Low |
| `risk-medium` | `#f2c14e` | Medium |
| `risk-high` | `#e8836b` | High |
| `risk-extreme` | `#d14b3d` | Extreme |
| `error` / `error-container` | `#d14b3d` / `#ffdad6` | error & badge |

> Warna level juga terpetakan di [risk.ts](../../src/lib/risk.ts) (`RISK_LEVEL_META`) sebagai
> satu sumber untuk badge, heatmap, dan chart.

### Spacing (skala 4pt)

| Token | Nilai | | Token | Nilai |
|---|---|---|---|---|
| `xs` | 4px | | `lg` | 24px |
| `sm` | 8px | | `xl` | 32px |
| `md` | 16px | | `2xl` | 48px |

### Typography

| Token | Nilai | Untuk |
|---|---|---|
| `font-display` | `Poppins` | judul/heading |
| `font-body` | `Inter` | teks isi (default `body`) |

### Radius

`radius-sm` 0.25rem · `radius-DEFAULT` 0.5rem · `radius-md` 0.75rem · `radius-lg` 1rem ·
`radius-xl` 1.5rem. Banyak kartu memakai radius eksplisit (`rounded-[16px]`, `rounded-[24px]`) —
ikuti nilai yang sudah dipakai komponen sejenis agar konsisten.

---

## Responsif

App adalah web SPA — desain **responsif** dengan breakpoint Tailwind (`sm`/`md`/`lg`/`xl`).
Pola umum di app: grid yang `grid-cols-1` di mobile lalu `lg:grid-cols-2`/`3` di layar lebar
(lihat [DashboardPage.tsx](../../src/features/dashboard/DashboardPage.tsx)). Uji minimal di lebar
mobile dan desktop; pastikan tak ada overflow/teks terpotong.

---

## Komponen & a11y

- Bangun komponen kompleks di atas **shadcn/ui (Radix primitives)** untuk a11y bawaan (focus
  ring, ARIA, keyboard nav) — NFR-09.
- Elemen ikon-only wajib punya label aksesibel (`aria-label`). Ikon dekoratif `aria-hidden`
  (lihat `Icon` di [ui.tsx](../../src/components/ui.tsx)).
- Level risiko **tidak hanya warna** — selalu sertakan label + skor (kontras WCAG AA).

```tsx
<Button variant="primary" icon="auto_awesome">Generate AI</Button>
<Button variant="outline" icon="download">Ekspor</Button>
```

---

## Asset

Ikon memakai **Material Symbols** lewat komponen `Icon` (`<Icon name="event_busy" />`). Untuk
gambar/ilustrasi, simpan di `src/assets/` dan import via alias `@/`.

---

## Aturan

- ❌ Jangan hardcode hex warna atau nama font di komponen.
- ❌ Jangan duplikasi nilai warna — tambahkan token di `@theme`, rujuk via utility/`var(--color-*)`.
- ✅ Cek `@/components/ui` & `RISK_LEVEL_META` dulu sebelum bikin komponen/warna baru.
