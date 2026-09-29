# Plus Qiskit Fall Fest ’26 — Bi-fold Inauguration Invitation

An interactive flipbook version of the bi-fold invitation card, with a realistic page-curl.

- **Turn pages:** drag a page corner or swipe with a finger (the page follows your finger; a quick flick also turns it), use the ‹ › buttons, or press the arrow keys (PageUp/PageDown also work).
- **Page order:** Invitation cover → Event schedule + Speakers → About (back cover).
- **Responsive:** two-page spread on wide screens (900px+); one page at a time, with the same page-curl, on phones and tablets (including phones held sideways). On one-page screens the ‹ › buttons sit in the bottom corners.
- **Look:** plain white page with the accent colours, fonts (Orbitron / Poppins) and navbar style of qffrguktn.com.
- **Smooth:** the book is drawn on a single canvas, images are pre-decoded and pre-uploaded, and turns use an ease-in-out curve.
- **Extras:** page-turn sound (mute button) and full-screen mode.

Built with React + Vite and [StPageFlip](https://github.com/Nodlik/StPageFlip) (`page-flip`); fonts are self-hosted via `@fontsource`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs ./dist
npm run preview    # serve the production build
```

## Deploy to Netlify

`netlify.toml` is already configured (build command `npm run build`, publish directory `dist`, Node 20).

1. In Netlify choose **Add new site → Import an existing project** and pick this GitHub repo.
2. Leave the detected settings as they are and click **Deploy**.

(Or drag the `dist` folder onto https://app.netlify.com/drop after running `npm run build`.)

## Changing the pages

The four page images live in `public/pages/` (WebP: `page-N-*.webp` at ~1346×1903 plus a lighter `-md` copy at 900px wide that is used on smaller screens). Replace the files, keep the names, or edit the `PAGES` array in `src/App.jsx`.
If the page proportions change, update `PAGE_W` / `PAGE_H` at the top of `src/Flipbook.jsx`.
