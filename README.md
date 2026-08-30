# WebFlasher

WebUSB flasher for [Rubberless-Ducky](https://github.com/QWavey/Rubberless-Ducky) firmware, deployed to GitHub Pages.

Live: **https://qwavey.github.io/WebFlasher/**

## Layout

```
index.html            single-page flasher, references css/js separately
css/style.css         all styling
js/flasher.js         Atmel AVR32 DFU flasher over WebUSB, plus wizard UI
assets/favicon.svg    split-duck favicon (the joke)
assets/device.svg     line-art AT32UC3B device illustration
firmware.hex          bundled prebuilt image
```

## Runs how

`js/flasher.js` implements the Atmel DFU protocol subset used by `dfu-programmer` for AT32UC3B parts: chip erase, region + base-page select, page-by-page program with a 5-byte header, launch. Intel-HEX parsing is inline. The UI wizard is a plain accordion with `active`/`done`/`error` states per step, no framework.

## Editing

The three files are separate so any of them can be edited without touching the others:

- **Structure** in `index.html`
- **Look** in `css/style.css` (design tokens are all at the top of `:root`)
- **Behavior** in `js/flasher.js` (protocol constants near the top)

## Legal

Clean-room reimplementation. No Hak5 code, firmware, or artwork is distributed here. See the full note in the [main repo README](https://github.com/QWavey/Rubberless-Ducky#legal).
