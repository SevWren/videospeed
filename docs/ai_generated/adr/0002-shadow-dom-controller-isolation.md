# Render the controller inside a Shadow DOM to isolate it from host-page styles

Host pages apply aggressive CSS resets, z-index stacking, and font overrides that break injected UI. Mounting the controller as a Shadow DOM host (`element.attachShadow({ mode: 'open' })`) with its own stylesheet (`shadow.css`) prevents host styles from leaking in and prevents controller styles from leaking out. An iframe would give stronger isolation but would require cross-frame messaging for every user interaction and cannot be positioned relative to a `<video>` element reliably across sites.
