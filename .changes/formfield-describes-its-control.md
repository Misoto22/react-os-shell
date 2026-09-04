---
bump: patch
title: A field points at its own error message, and says it failed
---

- **A field now points at its own error message.** `FormField` rendered the
  hint and the error with ids — `${htmlFor}-hint`, `${htmlFor}-error` — and
  pointed nothing at them, so those ids referenced nothing. A screen-reader
  user who focused a field that had failed validation heard the label and
  "invalid" and never the reason.

  `role="alert"` is not a substitute: it announces the message the moment it
  appears, while `aria-describedby` is what re-reads it when the user tabs BACK
  to fix the field — which is exactly the moment they need it.

  A single element child is cloned with `aria-describedby`. An
  `aria-describedby` the control already carries is kept and appended to rather
  than replaced; several children, a fragment or a bare string are left exactly
  as they were, for the caller to wire as `MediaUploadField` and
  `MediaUploadGrid` already do by hand.

- **And it is announced as invalid.** The same clone carries `aria-invalid`
  while `error` is set. Every input in the kit takes its own `invalid` prop, so
  a caller had to pass the error to `FormField` and `invalid` to the control
  and keep the two in step by hand — and a field that missed one reads as valid
  with a red message under it. `error` is already the statement that the field
  failed. A control that sets its own `aria-invalid` keeps it, so `Input`,
  `Select`, `Textarea` and the pickers stay authoritative over their own
  attribute.
