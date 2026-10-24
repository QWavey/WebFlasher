# Tasks

## GitHub issues (synced 2026-10-24)

Source: QWavey/WebFlasher issue #2 (audit of 2026-10-20). Items are the bullets of that issue. Items that repeat the same code change share one commit.

- [ ] #2 Third-party and mutable-ref executables offered with no digest — index.html:367 — SKIP — security hardening not wanted for pentesting gadgets (digests, pinning)
- [ ] #2 Destructive write path rests on unverified protocol details — js/flasher.js:368 — FIX — open: needs real AT32UC3B hardware and a check against dfu-programmer before the write path changes; erase behaviour and command bytes not changed
- [x] #2 Low base addresses are remapped instead of refused — js/flasher.js:313 — FIX — fixed in b12f9d7
- [ ] #2 Flashed firmware image has no pinned digest — js/flasher.js:444 — SKIP — security hardening not wanted for pentesting gadgets (hashing, integrity)
- [x] #2 Hex input is allocated before it is size- or window-checked — js/flasher.js:306 — FIX — fixed in a4240fb
- [ ] #2 Third-party font stylesheet with no SRI and no CSP — index.html:13 — SKIP — security hardening not wanted for pentesting gadgets (SRI, CSP)
- [x] #2 Wizard navigation and Connect stay live during a write — js/flasher.js:116 — FIX — fixed in b77f3cf
- [ ] #2 Select-region and select-page framing differs from the README reference — js/flasher.js:377 — FIX — open: needs real AT32UC3B hardware, since a wrong framing writes the wrong page; bytes not changed. Comment added in 09fd5c7
- [x] #2 Retry after a DFU error is refused until the device is reconnected — js/flasher.js:349 — FIX — fixed in c40d64c
- [x] #2 Stop or unplug mid-write shows a raw TypeError and can leave Flash enabled — js/flasher.js:339 — FIX — fixed in 1bebf42
- [x] #2 Image base is not checked for 512-byte alignment — js/flasher.js:312 — FIX — fixed in b12f9d7 (README lists the new check)
- [x] #2 Addresses below 0x80000000 are accepted as flash offsets, contrary to the README — js/flasher.js:313 — FIX — fixed in b12f9d7
- [ ] #2 Transfer status is never checked; launch success is unverified — js/flasher.js:334 — FIX — open: status check and reply-length guard fixed in f7014d6; the GETSTATUS poll after launch is not added, since the part can reset off the bus during manifest and the poll could report a false failure (needs hardware)
- [x] #2 Interface selection falls back to a stale or default interface — js/flasher.js:507 — FIX — fixed in f7014d6
- [x] #2 Image span is allocated before the flash window is checked — js/flasher.js:306 — FIX — fixed in a4240fb
- [x] #2 Reconnect, Connect and file picker stay live during a write — js/flasher.js:116 — FIX — fixed in b77f3cf (the capture-device-once refactor is not needed while the wizard is locked)
- [x] #2 Unaligned image base can straddle a 64 KiB boundary and mis-encode the end address — js/flasher.js:312 — FIX — fixed in b12f9d7
- [x] #2 Documented refusal of bases outside the flash window is not enforced — js/flasher.js:313 — FIX — fixed in b12f9d7
- [x] #2 parseHex allocates before validating and has no input size cap — js/flasher.js:306 — FIX — fixed in a4240fb (window check before allocation, 2 MB file cap); decode-once and rejecting unknown record types not done (improvement, no defect)
- [ ] #2 No automated tests for parser, window checks or command bytes — js/flasher.js:257 — SKIP — adding a test harness is a feature, not a defect
- [x] #2 USB transfer status is never checked; interface discovery is loose — js/flasher.js:334 — FIX — fixed in f7014d6 (named DFU state constants, device closed on a failed connect)
- [ ] #2 Downloads point at mutable refs with no checksums — index.html:279 — SKIP — security hardening not wanted for pentesting gadgets (pinning, checksums)
- [x] #2 Stop path relies on timing and re-enables Flash with no device — js/flasher.js:410 — FIX — fixed in 1bebf42
- [ ] #2 Design-system literal rule is not enforced in CSS or JS — css/style.css:6 — SKIP — style only, no functional defect; style changes are out of scope
- [ ] #2 Duplicated image intake, unclear naming and doc drift — js/flasher.js:249 — SKIP — refactor and naming, no functional defect. The keydown condition at js/flasher.js:669 is correct as written (&& binds tighter, and the intent holds)
