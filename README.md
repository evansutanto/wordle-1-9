# Our Little Wordle

A cute, four-board Wordle made for a three-month anniversary. It is a plain static site, so it can be hosted directly on GitHub Pages.

## Run locally

From this folder, run any static server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Personalize

Edit the `PUZZLES` and `FINALE_MESSAGE` constants near the top of [script.js](script.js). The game accepts the private answer `ANNIV` even though it is not a standard dictionary word.

## Publish on GitHub Pages

Push the three site files (`index.html`, `styles.css`, and `script.js`) to a repository, then choose **Settings → Pages → Deploy from a branch** and select the branch and root folder. GitHub Pages will serve `index.html` automatically.
