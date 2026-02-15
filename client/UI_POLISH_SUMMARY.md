# UI polish & consistency – summary

## Files touched

| Area | Files |
|------|--------|
| **Design system** | `src/index.css`, `src/components/ui/Button.tsx` (new) |
| **Auth** | `src/pages/Authpage.tsx` (submit uses `btn-primary`) |
| **Admin forms** | `src/components/admin/TaskForm.tsx` (inputs + buttons) |
| **Client detail** | `src/pages/ClientDetailPage.tsx` (full dark theme, glass cards, buttons) |
| **List pages** | `src/pages/RevenueList.tsx`, `src/pages/TasksOverview.tsx`, `src/pages/ClientsList.tsx` (filters + search) |
| **Navbar** | `src/components/Navbar.tsx` (pills border, logout `btn-secondary`, focus-visible) |
| **User** | `src/components/user/ProjectCard.tsx` (View button → `btn-secondary`) |

## Changes (by commit theme)

### 1. Design system (button + input + glass)
- **index.css**: `.glass-card`, `.input-dark`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` with border, hover, `focus-visible` ring, disabled.
- **Button.tsx**: Reusable `Button` with `variant` primary | secondary | ghost.

### 2. Inputs
- Global inputs already dark in `index.css`; TaskForm and other forms no longer override with `bg-white` / `border-gray-300`.
- TaskForm: all inputs/selects use `input-dark`; project subform and main task form aligned.
- RevenueList, TasksOverview, ClientsList: search inputs use `input-dark`.

### 3. Auth page
- Login submit uses `btn-primary` (consistent border, focus-visible, disabled).

### 4. Admin + Client detail
- **ClientDetailPage**: Page and loading/error states use dark background (`bg-app`). All cards use `glass-card`. Stats, tabs, and content use `text-white/95`, `text-white/70`, `text-white/50`. Buttons use `btn-primary` / `btn-secondary` / `btn-ghost`. Status badges use dark-theme semantic colors (e.g. `bg-green-500/20 text-green-400`). List rows use `border-white/10 hover:bg-white/10`.
- **TaskForm**: All form controls and actions use design system classes.
- **RevenueList / TasksOverview / ClientsList**: Filter pills use dark inactive state (`border border-white/10 bg-white/5`, active with accent/semantic colors). Search uses `input-dark`.

### 5. Buttons and focus
- Buttons have visible border or outline, hover, `focus-visible:ring-2` (accent or white), disabled opacity + cursor.
- Navbar: Analytics/Dashboard pills have border when inactive; Logout uses `btn-secondary`; Log In link has border and focus-visible ring.
- Modal close buttons already had focus ring; no change.

## Verification

- No white-on-white or low-contrast text: all surfaces use dark or glass; text uses `text-white/90`, `text-white/70`, `text-white/50` or semantic colors.
- Buttons: consistent borders and focus rings via `.btn-primary`, `.btn-secondary`, `.btn-ghost`.
- Inputs: `input-dark` and global input styles (dark bg, border, placeholder, focus ring).

Run and check:

```bash
cd client && npm run dev
```

- Login: labels, inputs, button readable; focus tab on button shows ring.
- Dashboard / Admin: tabs and filters readable; form inputs dark with focus ring.
- Client detail: entire page dark; cards, tabs, lists and buttons consistent.
- Revenue / Tasks / Clients list: filter pills and search inputs dark and readable.
