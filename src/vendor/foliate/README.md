# Foliate MOBI parser

- Upstream: https://github.com/johnfactotum/foliate-js
- Pinned commit: `78914aef4466eb960965702401634c2cb348e9b1`
- Source: `mobi.js`, copied without changes; MIT license in `LICENSE`.
- Purpose: browser-side MOBI and KF8/AZW3 parsing. Telysta owns the viewer controls, pagination, sanitization, CSP and iframe sandbox.
- Imported only by the lazy Kindle reader module. Books remain in their original R2 objects; no conversion or additional book upload is required.

When updating, inspect upstream changes, retain the license, and repeat real MOBI/AZW3 and malicious-content reading checks. Do not enable book scripts or DRM bypasses.
