# Letterboxd Official Lists

A Chrome extension that shows which [Letterboxd official lists](https://letterboxd.com/official/) include a film. The lists appear on the film page, below **Where to watch**.

## Install

1. Clone or download this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Open a film page, for example [Branded to Kill](https://letterboxd.com/film/branded-to-kill/).

After you change the code, click the reload icon on the extension card and refresh the film page.

## How it works

- The content script runs only on main film pages (`/film/<slug>/`).
- It fetches `/official/film/<slug>/lists/by/popular/` and reads the list titles and links. If there is more than one page of results, it reads the next pages too.
- It hides lists whose titles contain a blocked phrase. Edit `BLOCKED_PHRASES` in `extension/content.js` to change them.
- It caches results per film in `chrome.storage.local` for 24 hours. Expired entries are removed automatically.

The extension sends requests only to `letterboxd.com`, with your normal browser session. It does not collect or send data anywhere else.

## Limitations

- The extension reads Letterboxd's HTML. If Letterboxd changes its page layout, the extension can stop working.
- If Letterboxd shows a security check, the panel shows **Could not load** with a link to the lists page.

Not affiliated with Letterboxd.
