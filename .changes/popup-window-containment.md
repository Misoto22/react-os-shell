---
bump: minor
title: An anchored popup stays inside the window that owns it
---

- **A dropdown no longer opens onto the desktop beside the window that owns
  it.** Every anchored popup in the kit — `Select`, `SearchableSelect`,
  `TagInput`, `DatePicker`, `DateRangePicker` — is portalled to `<body>` so an
  `overflow-hidden` window body cannot clip it in half. That escape was about
  clipping, and the placement then measured its room against the VIEWPORT: on a
  1150px window in the middle of a wide screen, a filter near the window's right
  edge opened a 448px option list 200px past the window and onto the wallpaper.
  Nothing was hidden and nothing looked broken; the menu simply stopped
  belonging to anything. Placement is now measured against the shell window the
  trigger sits in (`[data-modal-panel]`, intersected with the viewport so a
  half-dragged window still behaves), falling back to the viewport on a routed
  page or a till. A window narrower than the menu's preferred width caps the
  menu instead of letting it overhang.

- **One placement helper, not three.** `Select` carried its own copy of the
  flip/track/clamp maths and `DateRangePicker` a third, so the same trigger
  placed its popup differently depending on which control was under it. Both now
  take `useDropdownPosition`; `Select` asks for its native-select width with the
  new `matchTriggerWidth` option, and `DateRangePicker`'s panel is portalled
  like every other one.

- **The date-range panel can no longer be resized by the page around it.** Its
  panel used to be an `absolute` child of the trigger, which put it inside a
  consumer's layout: a filter bar that stretched its controls with
  `[&>div>div]:w-full` also stretched — and therefore shrank — the calendar, so
  a panel needing 450×370 computed to the trigger's 280×36 and drew the calendar
  and its preset column onto the page behind it with no surface underneath.
  Portalled, the panel is out of reach of that CSS and states its own size.

- **`DateRangePicker` takes `fullWidth`.** The trigger is `inline-flex`, which
  is right in a toolbar row and wrong in a filter grid where every other control
  is `block w-full`. That gap is what consumers were papering over with
  descendant selectors; the prop is the supported answer, and it truncates a
  long range label rather than wrapping the field.
