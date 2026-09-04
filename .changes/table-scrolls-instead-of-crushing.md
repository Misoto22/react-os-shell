---
bump: patch
title: A wide table scrolls instead of crushing its columns
---

- **A wide table now scrolls sideways instead of crushing its columns.**
  `ResizableTable` turned each column's width into a percentage of the running
  total and put it on a `w-full` table, which made every width a RATIO and
  never a size. The table therefore always measured exactly its container:
  thirteen columns in a 1118px window came out at 91px each, and every currency
  figure truncated to `A$514…`. Adding a column made every other column
  narrower, and a list with 45 columns had nowhere to go at all.

  Two things followed from the same line. The body's `overflow-x-auto` was dead
  code — a table that can never exceed its container never overflows, so there
  was nothing to scroll to. And a resize handle could only STEAL width from
  other columns: widening one narrowed its neighbours and the total never
  moved, which is not what dragging a column edge means anywhere else.

  Widths are pixels now, with the table floored at `min-width: 100%`. Under-full
  it still stretches to the container and `table-layout: fixed` distributes the
  slack proportionally, exactly as the percentages did — narrow lists are
  unchanged. Over-full it is finally wider than its container and scrolls. The
  header is its own table outside that scroller, so it is driven by the body's
  scroll; left alone it would sit still while the rows moved under it and the
  labels would stop naming the columns beneath them.
