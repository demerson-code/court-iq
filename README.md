# Court IQ — Volleyball Rotation Tool

A shareable web tool for youth volleyball coaches to generate the strongest starting 6 and full 6-rotation order based on per-player skill ratings.

**Live**: https://demerson-code.github.io/court-iq/

## Features

- Roster management with 7 skill ratings per player (Setting, Passing, Serving, Spiking, Defense, Attitude, Communication), each 1–10
- Per-game availability toggle (mark players in/out without losing their data)
- Adjustable global skill weights — emphasize what matters most at your level
- **Strict mode**: full 6-rotation order honoring real volleyball rotation cycle, balanced so no rotation is too weak
- **Loose mode**: best player in each spot, no rotation cycle
- Animated court diagram with first-name circles, server and setter highlighted
- Rotation strength bars to spot weak rotations at a glance
- Suggested serving order (overridable)
- Bench list ranked by skill — coach knows who to sub in mid-game
- Auto-save to localStorage; share-link feature encodes full state in URL hash
- Fully responsive — phone / tablet / desktop

## Stack

- One HTML / one CSS / one JS file
- Zero dependencies, zero build step
- Deploys to GitHub Pages

## Local Development

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Sharing

Tap the link icon in the top-right to copy a share URL. The full team data is encoded in the URL hash — anyone with the link gets the same roster and weights. Single-coach editing model: whoever has the link, owns it.
