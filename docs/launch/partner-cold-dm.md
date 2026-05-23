# Partner Cold-DM Template — Cosa Nostra Tycoon

> **When to use this**: §33.2 Week 2-3 of the launch playbook. Target = 20
> Telegram bot operators we don't already know. Goal = 2-3 letters of
> intent (LOIs) before we sink 8-10 weeks into V1 backend.
>
> **Why this works**: The game is already mostly built (mockup +
> backend foundation). We're not asking partners to gamble on a
> wireframe; we're offering them a finished mini-game to embed in their
> bot under a rev-share. From their side it's pure upside: their users
> get a new toy, they get a slice of Stars revenue, they ship nothing.

## Target list rules

Pick partners whose audience overlaps ours **and** who have leverage
we don't:

1. **Minimum 5,000 monthly DAU.** Anything smaller is a courtesy
   conversation, not a distribution channel.
2. **Active group or DM volume** — a bot with 50k installs but no
   chats won't move signups.
3. **No direct competitor mini-games** already in their flow. We don't
   want to fight for shelf space.
4. **English / multilingual ops.** Skip Telegram bots that are
   monolingual in a market we're not yet ready to support.
5. **Reachable owner.** Username public, not a faceless agency.

Build the list in a Google Sheet with columns:
`bot_handle | est_dau | category | owner_handle | first_dm_sent_at | response | loi_sent_at | loi_signed_at | partner_src_tag | notes`

The `partner_src_tag` column matters — once you DM, send each partner
a link with `/tycoon?src=partner-bot:<their_tag>` so signup attribution
falls out of `tycoon_signups.source` automatically.

## DM #1 — first contact (cold)

Send this on Telegram DM, **not** email. Keep it short. They're a bot
operator; they delete formal emails on sight.

```
Hey [@OwnerHandle],

Saw you run [@BotName] — really like what you've done with [specific
feature you actually noticed, e.g. "the captcha flow" or "the way
you handle group XP"].

I'm building Cosa Nostra Tycoon — a Telegram Mini App game (mafia tycoon /
city builder vibe). Mockup playable right now: [insert /tycoon link with
?src=partner-bot:<tag>].

The pitch for you: it's a zero-install mini-game your users can launch
from your bot. They build a crew, raid rivals, fight other families.
Server-authoritative, monetized via Telegram Stars. We split Stars
revenue from your users 70/30 in your favor.

Three things I'd want from you to make this work:
  1. A /play or /tycoon command in your bot that opens the WebApp.
  2. A one-time announce DM to your users on launch week.
  3. (Optional) Your bot username on the launch leaderboard.

In return you get: 70 % rev-share on Stars from users that come in
through your bot, your bot's name on the leaderboard, and zero
engineering on your side (we ship a copy-paste handler).

Worth a 15-min call this week to walk through the mockup?

— [your name]
```

Why each line is there:

- **Specific feature you noticed** — proves you're not spraying. Two
  minutes of homework on each bot pays for itself.
- **Mockup link first, pitch second** — operators will tap before they
  read. Let them see the toy.
- **70 % their way** — sounds generous, but the alternative is paid UA at
  $1-3/install and far worse retention. 70/30 in their favor still leaves
  us with a positive contribution margin once Botwave's owned funnel
  takes most of the volume.
- **Three concrete asks** — they can mentally cost it. Vague asks get
  vague answers ("interesting, let's chat next week" forever).
- **Concrete CTA** — "worth a 15-min call this week" is a yes/no question,
  not an open-ended invitation.

## DM #2 — bump (Day 4 if no reply)

```
Hey [@OwnerHandle] — bumping the mafia mini-game from Monday.

Quick number: our existing bot user base has been tapping through to the
lander at [X %], signup at [Y %] of taps. Mockup is at [link].

Even if a partnership doesn't work right now, would you take 30 seconds
to look and tell me what's wrong with the pitch? Trying to learn
faster.
```

Why this works:

- **Data point** — once you have signup rates from your own DM blast,
  drop them in. "We have a real funnel" is more credible than "we
  think this will work".
- **Asks for the no** — the second paragraph reframes "ignored" as
  "you helped me", which is socially expensive to keep ignoring.

## DM #3 — last touch (Day 10 if still no reply)

```
Last ping. If [@BotName] is open to a one-time announce DM at launch
(no integration on your side, no ongoing work, just a single message),
say the word — I'll send you the exact copy and the link with your
attribution tag baked in. Otherwise no worries, I'll get out of your
inbox.
```

If they don't respond after DM #3, drop them and move on. Three
touches in 10 days is the limit before you damage your sender
reputation.

## The 15-min call

Open with the mockup, not slides. Share screen, open the live mini app,
let them play one raid. **First 60 seconds should be the game running,
not you talking.** Slides are for follow-up; the live demo is the
hook.

Walk-through order:

1. Open `t.me/<your_bot>/play` (or send them the deep link).
2. Click through one combat resolution.
3. Show the Stars purchase modal.
4. Show the partner leaderboard (mocked is fine — name their bot).
5. Then talk numbers.

## Numbers to memorize before any call

You will be asked these. Have the answer in your head, not in a deck.

- **Day-1 install funnel** from Botwave: _______ %
  *(landing tap-through × signup × app-open at launch)*
- **D1 / D7 from mockup test cohort**: _______ % / _______ %
  *(if you don't have this, say "TBD, launch week")*
- **ARPDAU you're modelling**: _______ ¢
- **Stars-payout cycle time** (Telegram → wallet): currently ~14 days
- **What partners get paid in**: Stars on the platform; cash-out via
  Telegram's payout flow. We send a monthly attribution report.
- **What share they get**: 70 % of net Stars revenue from users
  attributed to their `?src=partner-bot:<tag>` signups.
- **Why 70 % and not 50/50**: Cold-start. Once we have proven D7 and
  scale, future partner cohorts get 50/50. First 3 LOIs are at 70/30.

## When they ask "why should I sign now and not wait?"

You have two honest answers:

1. **Better rev-share for early signers.** First three LOIs get 70/30
   for 6 months; later partners get 50/50.
2. **Launch slot.** Only the first three partner bots get a leaderboard
   slot at launch. After that the spots are filled.

Both are real constraints. Don't invent urgency that doesn't exist —
operators have seen every fake scarcity trick and they will lose
respect for you the moment they spot one.

## LOI structure

Keep it one page. The actual contract comes after launch when there's
real money to share. The LOI just locks in:

1. Partner bot will add a `/tycoon` (or equivalent) command launching
   the WebApp.
2. Partner will send one announce DM to their user base in launch week.
3. We commit to 70/30 rev-share for 6 months on attributed Stars
   revenue, payable monthly in Stars (or cash equivalent if mutually
   agreed).
4. Termination: 30-day notice, no penalty, all attribution data
   provided on exit.

Use [`partner-deck.md`](./partner-deck.md) as the one-pager you attach
to the LOI as context.

## Anti-patterns

Things to NOT do during outreach:

- **Don't open with "I'm CEO of X, we raised Y."** Operators don't
  care. Open with the toy.
- **Don't send a Calendly link in the first DM.** Suggest a time,
  let them counter. Calendly first-touch is a status flex that
  backfires with bot operators who run small ops.
- **Don't follow up more than 3 times.** You're not selling enterprise.
- **Don't promise features in the LOI you don't have.** If your
  mockup doesn't do guilds yet, don't promise guilds for launch.
- **Don't go below 60 % their share** without a really good reason.
  The math on cold-start partnerships only works because their
  distribution is essentially free for you.

## Tracking

Every time you DM a partner, send their link as:

```
https://www.botwave.online/tycoon?src=partner-bot:<their_tag>
```

That populates `tycoon_signups.source` automatically. Weekly cut:

```sql
SELECT source,
       count(*) AS signups,
       round(100.0 * count(*) FILTER (WHERE created_at > now() - interval '7 days')
             / nullif(count(*), 0), 1) AS pct_this_week
FROM tycoon_signups
WHERE source LIKE 'partner-bot:%'
GROUP BY source
ORDER BY signups DESC;
```

The §33.4 G1 gate is **2-3 partner LOIs signed by end of Week 3**.
Below that, you don't have B2B2C distribution validated — Botwave-only
launch is still on, but the partner-channel projections in the
investor deck don't apply.
