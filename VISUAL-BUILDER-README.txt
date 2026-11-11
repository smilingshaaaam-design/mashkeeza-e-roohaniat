Mashkeeza Visual Builder - Integration Notes

This is an incremental enhancement of the original Next.js project, not a replacement design.

Live editor: open your PUBLIC website with ?edit=1 appended to the URL, then authenticate with your CMS login. The editor already existed in the source and now has a Menu builder button and drag/drop menu tree.

Drag a menu item onto another row to place it after the target. Hold Shift when dropping to nest inside the target. Use arrow buttons for keyboard-accessible ordering, and ↖ to move a submenu to the root. Click a menu to edit or link a published Page. Save Draft and Publish explicitly.

Published pages are now accessible at /pages/<slug>. The route reads /public/content and only renders published pages returned by that endpoint.

IMPORTANT: Existing public site design and magical animations are preserved. This does NOT yet implement Elementor-level freeform styling of every section or independent mobile layouts. The editor must be authenticated, and Cloudflare Worker cookie/CORS policy must allow it. Please test on a preview deployment first.
