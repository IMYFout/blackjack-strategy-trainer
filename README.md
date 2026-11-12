# Blackjack Lab — Strategy Trainer

A free, open-source, **installable** Blackjack basic-strategy trainer. One player against one dealer. **No real or simulated bankroll, no real bets, no sign-in, no ads.** The only thing that counts is making the correct decision.

![MIT License](https://img.shields.io/badge/license-MIT-green)

## What you get

- Complete, beginner-friendly **English tutorial**: objective, card values, hard/soft totals, actions, dealer procedure, table assumptions, and Hi-Lo card counting.
- **Unlimited 1-on-1 rounds** dealt from a genuine 312-card shoe (six standard decks); cards leave the shoe and aren't replaced between hands. The shoe reshuffles after approximately 75% penetration.
- Every available decision: **Hit, Stand, Double, Split, Surrender**, plus **decline/take Insurance** against an exposed dealer Ace.
- **Immediate strategy grading**. If you pick the wrong option, you get a red ✕, the correct action, an explanation, and the rule. The game **doesn't advance** until you choose correctly.
- Automatic progression after a correct answer; optional auto-dealing between rounds.
- Legal-action fallback after hitting or splitting (e.g. doubling and surrender aren't always available).
- An interactive **strategy chart** that uses the very same grading engine.
- Optional **Hi-Lo running-count checkpoint** and approximate true-count reveal. The dealer's hidden card does not enter the count until it is shown.
- Accuracy, streak and perfect-round statistics saved locally (`localStorage`); reset whenever you wish.
- PWA manifest, app icons, service worker for offline use after the first visit, responsive mobile layout.
- No npm install or build step required.

## Rules (important)

This version intentionally uses **one fixed rule set** so every graded move agrees with its tutorial and chart:

| Setting | This trainer |
| --- | --- |
| Shoe | 6 decks, 52 cards each |
| Dealer soft 17 | **Stands** (S17) |
| Hole card | American hole card; dealer checks for BJ when showing Ace / 10 |
| Double | Any original two cards, including after splitting (DAS) |
| Split | Same value, to a maximum of four hands |
| Split Aces | Only one additional card per split Ace; no resplit |
| Surrender | **Late** surrender, original two cards only |
| Winning natural blackjack | Standard **3:2**, for reference only (there are no money outcomes) |
| Reshuffle | At approximately **75%** of the shoe used (between rounds) |

A player's initial Blackjack may end a round without a decision. Those rounds count as rounds completed but not as 'perfect decision rounds'.

### Strategy reference

The recommendation algorithm uses the **4–8-deck, S17, DAS, late-surrender basic strategy** described by Michael Shackleford at [Wizard of Odds](https://wizardofodds.com/games/blackjack/strategy/4-decks/). See also [Blackjack game rules](https://wizardofodds.com/games/blackjack/basics/). This simulation follows a standard basic-strategy chart, rather than calculating composition-dependent optimal play from the remaining shoe.

**Important:** actual casino table rules vary. Changing to H17, no-DAS, no surrender, a different number of decks, etc., can change some correct moves. Basic strategy does not guarantee a win or positive expected value. The Hi-Lo tool is educational and does not adapt the graded basic strategy based on count-based deviations.

## Try it without publishing

Download `blackjack-lab-standalone.html` (provided separately) and open it in a modern browser. It is a single-file practice version; to **install on your home screen and use the offline PWA**, host the full repository on HTTPS (GitHub Pages is easiest).

For development, inside the project folder:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

The app can run on a local server or on GitHub Pages. The `src/` JavaScript is native ES modules; you do not need npm to run the app.

## Publish to GitHub Pages (free)

1. Create a **public** repository, e.g. `blackjack-strategy-trainer`, on your GitHub account. Public repositories are supported by GitHub Pages on GitHub Free.
2. Upload **the contents of this folder** to the repository root (keep `index.html` at the top level), or use Git:

```bash
cd blackjack-strategy-trainer
git init
git add .
git commit -m "Launch Blackjack Lab strategy trainer"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/blackjack-strategy-trainer.git
git push -u origin main
```

3. In your repository, open **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**.
4. In **Settings → Pages**, select **Visit site** when the site is published. The conventional address is `https://YOUR_GITHUB_USERNAME.github.io/blackjack-strategy-trainer/` (replace with your account name and actual repo name).
5. On iPhone, open the published URL in **Safari → Share → Add to Home Screen → Open as Web App → Add**. Now the app opens from an icon like a standalone app. The service worker provides offline use after it caches the site on a connected first visit.

Official instructions: [GitHub Pages publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [Apple: turn a website into an app](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

## Controls

- **Home**: overview and navigation.
- **Learn**: tutorials and main rules.
- **Practice**: one dealer versus one player; pick the best action each time. Wrong answer means try again, without drawing a new card.
- **Strategy chart**: Hard, soft, and pairs with the correct starting-hand action.
- **Progress**: locally stored accuracy and streaks.
- **Show count** on the Practice screen: enter your guess and click Check, or Reveal answer. The RC counts only visible cards. TC is an approximate measure: running count / decks remaining.
- Keyboard on Practice screen: `H` hit, `S` stand, `D` double, `P` split, `R` surrender. `Enter` starts another hand after a round completes.
- **New shoe** reshuffles and resets the Hi-Lo count, but retains accuracy stats.

## Testing

Requires Node.js 18 or later:

```bash
npm test
```

Tests cover strategy decision boundaries, hard/soft/pair cases, split limits, dealer peek, blackjack handling, counting, shoe continuity, 75% cut-card reshuffle, and 3,000 complete randomized rounds.

## Known scope limitations

- PWA (web app), **not** an Apple App Store IPA or Google Play app.
- The app follows one 6-deck U.S. ruleset, not every Las Vegas table variant.
- There is no betting simulator, cash balance, card-count-based betting spread, online gambling, multiplayer, or account sync.
- Stats are stored on the device and aren't shared between devices. Browser data clearing can erase stats.
- Phone installation and service-worker offline mode require a properly hosted secure (HTTPS) site, such as GitHub Pages. Opening the standalone HTML directly is for preview/practice, not native installation.
- Browser UI is not covered by the automated JavaScript unit tests; test the published site on your target device as well.

## License

MIT (see `LICENSE`). Contributions and forks are welcome.
