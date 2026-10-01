# Release 16C — Responsive & Accessibility Audit

## CRITICAL

### 1. Header Toolbar Overflow on Mobile Viewports
**Route:** Global / AppShell
**Component:** `Header.tsx`
**Viewport:** Mobile (320x568, 375x812)
**Observed behavior:** The right side of the Header contains multiple elements (Search button, Timer, Ask AI, Upgrade Plan, Notifications, User Profile). On viewports under 400px, these elements overflow the horizontal space, pushing content off-screen or causing the layout to break. The Search button has `w-full` which conflicts with the fixed widths of other icons.
**Expected behavior:** Action items should gracefully collapse into a dropdown menu (e.g., an ellipsis or "More" menu) on small screens, or the Search button should turn into a single icon instead of a full input box.
**Root cause:** Too many visible actions with fixed/minimum widths in a flex container without wrapping or mobile-specific collapsing.
**Recommended fix:** 
- Convert the Search button to just the magnifying glass icon on `xs`/`sm` screens.
- Move secondary actions (Upgrade, Help, Timer) into a mobile dropdown menu or hide them inside the sidebar drawer on small screens.

### 2. Dialog / Modal Overflow on Small Viewports
**Route:** Projects / Tasks
**Component:** `TaskDetailsPanel.tsx` (and potentially other Modals)
**Viewport:** Mobile (320x568, 375x812, 390x844)
**Observed behavior:** The `DialogContent` has `overflow-y-auto max-h-[90vh]`, but some inner fixed-width elements (like the RichTextEditor toolbar or large Select dropdowns) can cause horizontal scrolling inside the modal. The close button in Shadcn dialogs can sometimes be hard to tap on mobile if placed in the top right without adequate padding.
**Expected behavior:** Dialogs should take up `100vw` and `100vh` or be replaced by a bottom `Drawer` component on mobile for better ergonomics. No horizontal scrolling should occur.
**Root cause:** Desktop-optimized `Dialog` component used across all breakpoints without a mobile-friendly alternative (like `Drawer`).
**Recommended fix:** Use `vaul` (Drawer component) for mobile viewports, or adjust `DialogContent` to `w-full h-full p-4 rounded-none` on `max-w-sm`.

---

## HIGH

### 3. Touch Target Sizes Too Small
**Route:** Global
**Component:** `TaskCard.tsx`, `Header.tsx`, `TaskDetailsPanel.tsx`
**Viewport:** Mobile & Tablet
**Observed behavior:** Many icon buttons (e.g., Edit, Delete, Watch in `TaskDetailsPanel.tsx`, and icons in `Header.tsx`) use `size-8` (32x32px) or `size-6` (24x24px). The standard minimum touch target size for accessibility is 44x44px. 
**Expected behavior:** Interactive elements should have at least a 44x44px bounding box.
**Root cause:** Using compact utility classes (`size-8`, `h-8 w-8`) without increasing padding or adding touch-target utility classes for mobile.
**Recommended fix:** Increase the padding of icon buttons (`p-2` or `p-3`), or apply CSS to expand the hit area (e.g., `relative after:absolute after:-inset-2`) for mobile touch users.

### 4. Kanban Board Drag & Drop on Touch Devices
**Route:** /projects/[id]
**Component:** `TaskBoard.tsx`
**Viewport:** Mobile & Tablet Touch
**Observed behavior:** The Kanban board requires dragging to move tasks. On mobile devices, attempting to scroll horizontally might accidentally trigger a drag event, or dragging a task might not auto-scroll the `ScrollArea` container.
**Expected behavior:** Users can easily scroll the board without accidental drags. Dragging a card to the edge of the screen should pan the board.
**Root cause:** `@dnd-kit` PointerSensor might need touch-specific constraints (e.g., requiring a long press before drag starts).
**Recommended fix:** 
- Add `TouchSensor` with a `delay` (e.g., 250ms) and `tolerance` constraint so horizontal scrolling works flawlessly.
- Provide a fallback "Move To..." menu option on the `TaskCard` for accessibility and mobile users who cannot use drag-and-drop.

---

## MEDIUM

### 5. Keyboard Navigation and Focus Management
**Route:** Global
**Component:** `CommandPalette.tsx`, Forms, Select Menus
**Viewport:** All
**Observed behavior:** When opening modal dialogs or the command palette, focus is generally trapped correctly by Shadcn components, but some custom elements (like the RichTextEditor in `TaskDetailsPanel`) might not receive initial focus or might trap focus indefinitely, preventing users from tabbing out.
**Expected behavior:** Users can navigate entirely using the `Tab` key, and focus rings (`focus-visible:ring`) are clearly visible on all interactive elements.
**Root cause:** Missing `focus-visible` states on custom clickable divs (like task rows or custom drop zones) and missing `tabIndex={0}`.
**Recommended fix:** Audit all custom clickable `div` elements and replace them with `<button>` elements, or add `tabIndex={0}` and `onKeyDown` handlers for `Enter`/`Space`. Ensure `focus-visible:ring` is applied universally.

### 6. Workspace Switcher Truncation and Tapping
**Route:** Global / AppShell
**Component:** `WorkspaceSwitcher.tsx`
**Viewport:** Mobile (Sidebar Drawer)
**Observed behavior:** In the mobile sidebar drawer, the Workspace Switcher dropdown content (`w-[240px]`) might render off-center or overlap awkwardly with the drawer edges.
**Expected behavior:** The dropdown should adapt its width or position to fit within the mobile drawer constraints.
**Root cause:** Hardcoded `w-[240px]` on the `DropdownMenuContent`.
**Recommended fix:** Use `w-[--radix-dropdown-menu-trigger-width]` or apply responsive width classes (e.g., `w-full max-w-[240px]`) to the dropdown content.

---

## LOW

### 7. Inconsistent Hover States on Touch Devices
**Route:** Projects / Tasks
**Component:** `Sidebar.tsx`, `TaskCard.tsx`
**Viewport:** Mobile & Tablet Touch
**Observed behavior:** Elements that rely on `group-hover:opacity-100` (e.g., the "Plus" icon for creating a new project in the sidebar) require a "tap" to show on mobile, which immediately triggers the link or gets stuck in a hover state.
**Expected behavior:** Actions should be visible by default on touch devices, or hidden behind an explicit "Edit" mode or ellipsis menu.
**Root cause:** Reliance on CSS `:hover` states for revealing primary/secondary actions.
**Recommended fix:** Use media queries (`@media (hover: none)`) to always show these action icons on touch devices, or redesign the pattern to use a persistent "New" button.

### 8. Text Contrast in Dark Mode
**Route:** Global
**Component:** Badges (`TaskCard.tsx`, `TaskDetailsPanel.tsx`)
**Viewport:** All
**Observed behavior:** Some dynamic label colors or priority badges might have insufficient contrast against their backgrounds in Dark Mode (e.g., a dark blue text on a dark blue background).
**Expected behavior:** All text should pass WCAG AA contrast ratios (4.5:1).
**Root cause:** Hardcoded color palettes in `priorityColor` or `label.color` that haven't been fully verified for both light and dark themes.
**Recommended fix:** Review and refine the tailwind classes used for priority colors (e.g., adjusting `dark:bg-blue-900/50` opacity) to ensure readability.
