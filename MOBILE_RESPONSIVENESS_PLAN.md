# Mobile Responsiveness Plan — SayOps

## Context
The authenticated dashboard and Eva chat widget are desktop-only. Below 1024px the sidebar always occupies 200–400px of screen width, and the Eva widget opens at a fixed 380×520px positioned bottom-right. This plan adapts layout for screens < 1024px without any visual change to the desktop experience.

**Strict constraints:** Desktop UI pixel-identical at ≥ 1024px. No redesign. No new components. No backend/API/props changes. Pure CSS + breakpoint additions only.

**Breakpoint strategy:**
| Range | Treatment |
|---|---|
| < 768px | Mobile |
| 768px–1023px | Tablet (same as mobile treatment) |
| ≥ 1024px (`lg:`) | Desktop — **unchanged** |

---

## Phase 1 — Core Shell (Sidebar + Layout)

### 1. `stores/sidebarStore.ts`
Add `mobileOpen` state separately from `isCollapsed`. Use `partialize` to exclude it from persistence so it always resets to `false` on page load.

```ts
// Add to SidebarState interface:
mobileOpen: boolean
setMobileOpen: (val: boolean) => void

// Add to store initializer:
mobileOpen: false,
setMobileOpen: (val) => set({ mobileOpen: val }),

// Add partialize to persist config (excludes mobileOpen):
{
  name: 'speakops-sidebar',
  partialize: (state) => ({
    width: state.width,
    isCollapsed: state.isCollapsed,
    sections: state.sections,
  }),
}
```

> `isCollapsed` (desktop) and `mobileOpen` (mobile) are **fully independent**. Never mixed.

---

### 2. `components/app-sidebar.tsx`
- Outer sticky wrapper: add `hidden lg:flex` — sidebar is invisible below `lg:`
- Add sibling mobile overlay: `fixed inset-y-0 left-0 z-50 flex lg:hidden` rendered when `mobileOpen === true`
- Mobile overlay renders the **exact same** sidebar inner content — no content duplication
- Add close button (`IconX`) inside mobile overlay that calls `setMobileOpen(false)`
- Resize handle: add `touch-none` to prevent firing on touch devices

```tsx
{/* Desktop sidebar — unchanged at lg+ */}
<div className="sticky top-0 h-screen flex-shrink-0 hidden lg:flex" ...>
  {/* existing content */}
</div>

{/* Mobile overlay sidebar */}
{mobileOpen && (
  <div className="fixed inset-y-0 left-0 z-50 flex lg:hidden" style={{ width: DEFAULT_WIDTH }}>
    <button
      className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted"
      onClick={() => setMobileOpen(false)}
    >
      <IconX className="size-4" />
    </button>
    {/* same inner sidebar content */}
  </div>
)}
```

---

### 3. `components/site-header.tsx`
Current `SidebarTrigger` from shadcn is inert (sidebar is custom, not using `SidebarProvider`). Replace it with a button wired to the sidebar store.

```tsx
import { useSidebarStore } from "@/stores/sidebarStore"
import { IconMenu2 } from "@tabler/icons-react"

const { setMobileOpen, toggleCollapsed } = useSidebarStore()

<button
  className="-ml-1 p-1.5 rounded-md hover:bg-muted"
  onClick={() => {
    if (window.innerWidth < 1024) setMobileOpen(true)
    else toggleCollapsed()
  }}
>
  <IconMenu2 className="size-5" />
</button>
```

- Mobile (< 1024px): opens the slide-in overlay
- Desktop (≥ 1024px): existing collapse toggle behavior

---

### 4. `app/(authenticated)/layout.tsx`
Add a backdrop that closes the mobile sidebar when tapped:

```tsx
{mobileOpen && (
  <div
    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
    onClick={() => setMobileOpen(false)}
  />
)}
```

Backdrop is `z-40`, sidebar overlay is `z-50` — sidebar always renders above backdrop.

---

## Phase 2 — Eva Chat Widget

### 5. `components/chat/UniversalChat.tsx`

**Problem:** Inline `style={{ width: size.width, height: size.height }}` overrides Tailwind classes on mobile.

**Solution:** Use existing `hooks/use-mobile.tsx` (`useIsMobile`) to conditionally skip the inline style on mobile. Mobile-first CSS positioning.

```tsx
import { useIsMobile } from "@/hooks/use-mobile"
const isMobile = useIsMobile()

// Open bubble widget — outer wrapper:
<div className="fixed inset-0 z-50 flex flex-col lg:inset-auto lg:bottom-6 lg:right-6 lg:flex-col lg:items-end lg:gap-4">

  {/* Inner panel */}
  <div
    className={cn(
      "flex flex-col border bg-background shadow-2xl overflow-hidden border-primary/20 relative",
      "w-full h-full rounded-none",          // mobile: fullscreen
      "lg:rounded-xl lg:w-auto lg:h-auto"    // desktop: restore styles
    )}
    style={isMobile ? undefined : { width: size.width, height: size.height }}
  >
    {/* Resize handle: desktop only */}
    <div
      className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 rounded-tl-xl hover:bg-primary/20 transition-colors hidden lg:block"
      onMouseDown={handleMouseDown}
    />
    {chatContent}
  </div>

  {/* Collapse chevron button: desktop only */}
  <Button className="... hidden lg:flex" onClick={() => setOpen(false)}>
    <IconChevronDown className="size-5" />
  </Button>
</div>
```

**Body scroll lock:** Add `useEffect` in the open widget:
```tsx
React.useEffect(() => {
  if (isOpen && isMobile) {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }
}, [isOpen, isMobile])
```

**z-index notes:**
- Eva bubble: `z-50` (root layout — always above authenticated layout)
- Sidebar overlay: `z-50` (authenticated layout — never conflicts with Eva)
- Backdrop: `z-40` (below both overlays)

---

## Phase 3 — Landing Page

### 6. `app/page.tsx`
Already has responsive breakpoints. Minor fixes only:
- Meta row: `gap-8` → `gap-4 md:gap-8`
- Header nav links: audit at runtime, add `hidden md:flex` if overflow occurs

---

## Phase 4 — Login / Signup

### 7. `app/login/page.tsx`
Already responsive (`px-4`, `w-full max-w-md`). No changes needed.

### 8. `app/signup/SignUpForm.tsx`
Audit for fixed-width inputs. Ensure all inputs are `w-full`.

---

## Phase 5 — Inner Panels

### 9. `components/panels/DashboardPanel.tsx`
- Stats grid: `grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Charts: ensure `w-full` on containers

### 10. `components/panels/DocumentsPanel.tsx`
- Multi-column layouts → `flex-col md:flex-row`
- Tables → wrap in `overflow-x-auto`

### 11. `components/panels/AgentDetailPanel.tsx`
- Side-by-side form rows → `flex-col sm:flex-row`
- Tab content: verify stacking on mobile

### 12. `components/panels/HistoryPanel.tsx`, `IntegrationsPanel.tsx`, `SettingsPanel.tsx`
- Tables → `overflow-x-auto` wrapper
- Card grids → single column on mobile

---

## Files Modified

| File | Change |
|------|--------|
| `stores/sidebarStore.ts` | Add `mobileOpen` + `setMobileOpen` + `partialize` |
| `components/app-sidebar.tsx` | `hidden lg:flex` on desktop, add mobile overlay |
| `components/site-header.tsx` | Replace `SidebarTrigger` with store-wired hamburger |
| `app/(authenticated)/layout.tsx` | Add backdrop overlay div |
| `components/chat/UniversalChat.tsx` | Mobile-first Eva, `useIsMobile` for conditional style, scroll lock |
| `app/page.tsx` | Minor gap fix |
| `components/panels/DashboardPanel.tsx` | Responsive grid |
| `components/panels/DocumentsPanel.tsx` | Overflow + stacking |
| `components/panels/AgentDetailPanel.tsx` | Form field stacking |
| `components/panels/HistoryPanel.tsx` | Overflow |
| `components/panels/IntegrationsPanel.tsx` | Overflow |
| `components/panels/SettingsPanel.tsx` | Overflow |

## Existing Utilities Reused

| Utility | File | Used For |
|---------|------|----------|
| `useIsMobile()` | `hooks/use-mobile.tsx` | Conditional inline style on Eva widget |
| `useSidebarStore` | `stores/sidebarStore.ts` | Extended with `mobileOpen` |
| `IconMenu2`, `IconX` | `@tabler/icons-react` | Hamburger + mobile sidebar close |

---

## Verification Checklist

- [ ] 375px — sidebar hidden, hamburger visible in header
- [ ] Tap hamburger → sidebar slides in from left with dark backdrop
- [ ] Tap backdrop → sidebar closes
- [ ] Eva bubble at 375px → tap opens fullscreen (inset-0), no border-radius, no resize handle
- [ ] Close Eva → collapses back to bubble at bottom-right
- [ ] Background scroll locked when Eva is open on mobile
- [ ] 1024px+ — sidebar always visible, desktop layout pixel-identical
- [ ] Eva at 1024px+ — 380×520px bottom-right, resize handle visible
- [ ] Landing page at 375px — no horizontal scroll
- [ ] Login/Signup at 375px — card centered, full width within padding
