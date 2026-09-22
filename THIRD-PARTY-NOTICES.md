# Third-party notices

Rundum's own code is MIT — see [LICENSE](LICENSE). This file covers material
from other projects that is **copied into this repository**, which is the case
that carries an obligation: a dependency installed from npm ships its own
licence inside `node_modules`, but a file we copied has to carry the notice
ourselves.

## Phosphor Icons

Twenty icons are inlined as SVG path data in
[`src/lib/icons.ts`](src/lib/icons.ts) — the ten sports, the four navigation
tabs, and the marks used by the empty, error and notification states. Regular
**Duotone** weight, from `@phosphor-icons/core` 2.1.1 — each glyph is its
outline plus a second path at 20% opacity filling the body, both taking
`currentColor`.

They are copied rather than installed because Rundum uses twenty of several
thousand icons, all on the same 256 grid: about 12 KB in total, with no
dependency to keep current and no request to make. The notice
below is reproduced in that file as well, so it travels with the paths if they
are ever moved.

<https://phosphoricons.com> · <https://github.com/phosphor-icons/core>

```
MIT License

Copyright (c) 2023 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Not covered here

These are installed, not copied, and keep their licences in `node_modules`:
Next.js, React, Supabase, Tailwind, Leaflet and Zod.

Map tiles are a separate matter. They are fetched from OpenStreetMap at
runtime, are © OpenStreetMap contributors under the ODbL, and are attributed
in the map itself. Moving to a licensed tile provider is on
[LAUNCH.md](LAUNCH.md).
