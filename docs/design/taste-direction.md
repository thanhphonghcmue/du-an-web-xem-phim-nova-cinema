# DIRECTION SHEET — The place carries it
seed 1430144662 · drawn 2026-10-14 · sector culture · tone luxury
Brief: NOVA Cinema Infinity: five-minute seat holds and adjacent group seating, cinema discovery

| | |
| --- | --- |
| Direction | The place carries it |
| Hero | Name under a photograph |
| Type | kept from the brand |
| Colour | kept from the brand |
| Sections | showcase (Close-up with column card) → list (Sticky photograph, active list) → pricing (Prices like a menu) → about (Wide photo, colour tile, facts) → footer (Photograph half, menu half) |
| Motion | Scaling wordmark |
| Photographs | the "Sky and space" set, as atmosphere |

This is the direction for this build. Adopt it. Do not blend it with the layout you would have made anyway,
and do not redraw because it is unfamiliar: unfamiliar is the point. Redraw a slot only when it conflicts
with a stated brand constraint or needs an asset that does not exist, and say why in your report.

The parts of this sheet were written separately and will disagree in small ways. Settle every disagreement in this order:
**house rules** (including type no smaller than 13px and body text of 16px or more) → **the direction** (the idea, the composition habits, where the
one accent goes) → **the type system and the palette** (which face does which job, the five size steps, which colour is the ground and where the
accent goes) → **the hero blueprint** → **the section blueprints**. Under each blueprint below, "Adjusted for this page" lists where it disagrees.
In practice: take geometry from blueprints (columns, proportions, what sits where) and take everything else from above them. Map every size a
blueprint names onto one of your five type steps instead of adding a sixth. Use one button shape, one corner radius and one pair of page margins on
the whole page, whatever individual blueprints say. If a blueprint names a kind of typeface (a light serif, a heavy grotesk), use the dealt face.

## 1. The idea
For a place, the photograph is the argument. One full-bleed image of where you would be standing fills the first screen, and the design steps back: the name sits along the bottom edge like a film title, or small in a corner, and nothing else interrupts the view. The page that follows keeps that restraint: few words, large pictures, long pauses. The designer's work here is editing: choosing the one frame that makes someone want to be there, and then not covering it.

Before anything else, write one sentence in your notes: "On this page, <the subject's own material> becomes <the device>."
Fill the first blank from your inventory of what only this client has (its name and what it means, its street, its numbers, its
constraint), then put the nearest competitor in the sentence: if it still works, the idea is the category's, not the client's.
Then name the one live thing the visitor can do on the page (SKILL.md step 4).

## 2. Composition
First screen: a single photograph at 100vw by 100svh, focal point kept clear of text. The name is set either very large (14–20vw) hugging the bottom edge with 16–24px of margin, or small (20–28px) top-left with a one-line description bottom-left. Navigation is two to four words in the top corners in the same small size. If text sits on the image, a soft neutral scrim under the text area only. Below, sections alternate between a short centred or left-set paragraph in a narrow column (max 52ch) with wide empty margins, and photographs shown large: one full-bleed, then a pair at different sizes, then one portrait offset to the right. Practical information (hours, address, rates, booking) is gathered once near the end in a plain two-column block.

## 3. Type
Kept from the brand. A face with some grace for the name; small, calm, well-spaced text everywhere else. Sentence case. Body 17–19px with leading around 1.55.

## 4. Colour
Kept from the brand. Neutral paper or deep neutral ground chosen to flatter the photographs; text ink drawn from the darkest tone in the imagery. Colour lives in the pictures.

## 5. Imagery
**Use the images that belong to the project in every picture slot.** For slots they cannot fill, real pictures of the subject's world from the open collections come next (start with `node /tmp/nova-taste-skill/skills/taste-skill/scripts/assets.mjs "culture"`, then queries from your inventory (its street, its materials, its trade's tools and history); credit them on the page), then the dealt photographs.

The dealt set is the palette. Choose four to six photographs with the same light. The hero image must have a calm area for the name. Full-bleed or large with square corners; never thumbnails, never a carousel of ten.

**Floor (the inspector checks it):** at least four real pictures on the page, usually six to twelve; SVG drawings do not count. One moving picture where an honest clip exists: `node <skill>/scripts/assets.mjs --video "<query>"`, used as a muted loop with a poster frame. Whatever this direction says about pictures, it is carried out with real ones.

Photographs dealt for this build, from the "Sky and space" set (skies, clouds, stars and night skies)
Order of preference for imagery: (1) the project's own photographs and product shots; (2) images you generate, if an image tool is
available; (3) real pictures of the subject's world found in the open collections (assets.mjs, downloaded and credited on the page);
(4) drawings of the subject in code; (5) these. They are real photographs (Unsplash licence, served by picsum.photos) of places, light and
texture. They are atmosphere, never a stand-in for a specific product, dish, person or interface. List the ones you use in your report so
they can be replaced.
Treatment: Leave photographs ungraded. If text overlays one, darken only the area behind the text with a neutral scrim.
- `https://picsum.photos/id/505/1600/1000` — Tiny silhouetted figure on a dark ridge under a blue and orange twilight sky · dark tone · deep blue, orange, black · calm area: top · native landscape · photo: lee Scott
- `https://picsum.photos/id/38/1600/1000` — White cumulus cloud rising against a dark teal sky · mid tone · dark teal, white · calm area: top · native landscape · photo: Allyson Souza
- `https://picsum.photos/id/724/1600/1000` — Green and red aurora glowing above silhouetted pine trees · dark tone · green, magenta, black · calm area: top · native landscape · photo: Nelly Volkovich
- `https://picsum.photos/id/974/1600/1000` — Person standing beneath the Milky Way with a warm glow on the horizon · dark tone · deep navy, violet, amber · calm area: left · native landscape · photo: Greg Rakozy
- `https://picsum.photos/id/114/1600/1000` — Dark storm clouds hanging over a faint mountain ridge · dark tone · dark teal, muted beige · calm area: all · native landscape · photo: Brian Gonzalez
- `https://picsum.photos/id/833/1600/1000` — Tiny aeroplane crossing a wide, softly overcast sky · light tone · warm grey, off-white · calm area: all · native portrait · photo: Paul Green
- `https://picsum.photos/id/607/1600/1000` — Soft streaked clouds in a blue sky above a calm sea · mid tone · sky blue, white, teal · calm area: all · native portrait · photo: Grégoire Hervé-Bazin
- `https://picsum.photos/id/721/1600/1000` — Clear twilight sky fading from deep blue to an orange horizon · dark tone · navy, orange, dusty pink · calm area: all · native landscape · photo: Jeremy Ricketts
The last two path numbers are width and height: request the exact crop you render (`/1200/1500` for a 4:5 portrait, `/2400/1350` for a hero) and
add `?grayscale` to desaturate. Use three to six of them, not all eight. Always set `width`, `height`, `alt` and `loading="lazy"` (not on the hero image).
Other sets that fit this brief: people, fog-and-quiet, architecture, city-day — `node draw.mjs --photos <set>` prints one in full; `--photos list` shows all sets. Taking photographs from another set is your call and is not a redraw; keep them to one light and one treatment.

## 6. Hero — Name under a photograph
A full-bleed photograph fills the top 58% of the 1440×900 viewport, touching the top, left and right edges, `object-fit: cover`, with its focal point in the upper two-thirds. The lower 42% is a flat ground colour that butts against the photograph with no gap. The name runs across this band on one line, spanning all 12 columns between 24px margins, at clamp(120px, 19vw, 300px), tracking -0.05em, line-height 0.85, its baseline 28px above the bottom edge so descenders nearly touch it. Fit the size to the length of the name so it never wraps. In the strip of ground between photograph and name, 24px under the photograph's edge, sits one row at 17px: the supporting sentence on columns 1–5 at the left margin, and the single action as a small solid rectangular button flush to the right margin. Navigation is four text links at 15px laid over the photograph's top-right corner, 24px in, with a neutral scrim behind that row only if the image is light there. No logo is repeated: the name is the logo. Nothing else is on the screen.

On a phone: The photograph takes the top 50svh at full width, re-cropped around its focal point. The name sits under it at 23vw on one line; a name longer than seven characters breaks onto two lines at 21vw, line-height 0.85, and fills the band down to a 16px bottom margin. The supporting sentence at 16px and the action button stack above the name on the left margin. The links collapse to one 'Menu' word over the photograph, top-right.
Headline: The name itself on one line, up to about 12 characters at 19vw (drop towards 13vw for longer names), and at most two lines on a phone.

## 7. Sections, in order
Each is a composition to rebuild with this project's content. Keep the geometry; change the subject. Re-order or drop a
section when the argument of the page needs it (see references/copy.md), never to fall back to a card grid.

### 1. showcase — Close-up with column card (full-bleed)
A full-bleed close-up photograph, 100vw by 100svh, with nothing over most of it. A four-column grid lies on top. One solid card in the ink colour, exactly one grid column wide (about 22vw) and 52svh tall, sits in the second column, vertically centred. Inside it, centred: the item's name at 30–36px, a variant line at 17px, the price or key fact at 17px, a small 3:2 photograph of the whole object (the card shows the whole, the background shows the detail), and at the foot a square-cornered action filling the card's width. The card is opaque, radius 0–6px, with no blur. When the section presents two or three items, each gets its own full-bleed frame and its card moves one column to the right each time, so position carries the sequence. The first card's name is the section heading.
On a phone: The photograph fills 100svh, cropped to its most detailed area. The card becomes a full-width block docked to the bottom, 46svh tall, left-aligned inside with 20px padding; the small whole-object photograph sits to the right of the name at 96px wide.

### 2. list — Sticky photograph, active list (split)
Two columns. The left, columns 1–5, is `position: sticky; top: 12vh` and holds one photograph or object at 4:5, 34vw wide, unframed on the ground. The right, columns 7–11, holds a vertical list of five to nine names (treatments, rooms, courses, services) at clamp(20px, 1.6vw, 24px), each row 58px tall with the name at the left and a price or duration right-aligned at 15px in the soft ink. The active row is full ink; the others rest at 40% opacity. Hovering, focusing or scrolling a row to the middle of the viewport makes it active, crossfades the left photograph to that item's image over 300ms, and opens a three-line description at 15px, 34ch wide, directly under the name, pushing later rows down. A heading of two or three words at clamp(32px, 3.4vw, 48px) sits above the list, aligned to its left edge, 48px above the first row.
On a phone: The photograph becomes a 4:3 band pinned to the top of the screen at 38svh while the list scrolls beneath it; the heading sits above the first row. Rows are 56px tall and the description opens on tap. The image changes with the row nearest the band.

Adjusted for this page:
- It fades text: anything a visitor reads, inactive items of a list included, is `--ink` or `--muted` at full strength (contrast 4.5:1 or more). The active item is told apart by `--ink` against `--muted`, weight or the accent, not by fading the rest.

### 3. pricing — Prices like a menu (list)
Prices set the way a good menu sets them. A heading of two to three words at 32–40px sits in columns 1–3. Columns 5–12 hold the list in two text columns with a 64px gap. Items are grouped under plain group names at 24px in medium weight with 48px above each group. Each item is a row: the name at 19px on the left, the price at the same size on the right on the same baseline, with tabular figures and the currency sign shown only once per group; beneath the name, one line of description at 16px in the softer ink, no wider than 36ch. Rows are 22px apart. Name and price are joined only by empty space (flex with `justify-content: space-between`), with no dot leaders and no lines. One small photograph (4:5, three columns wide) may sit under the heading in the left zone.
On a phone: One column. The heading at 28px, then the photograph at 60% width if used. Each item keeps name left and price right on one line at 17px, with its description beneath in the softer ink. Group names at 20px with 40px above.

### 4. about — Wide photo, colour tile, facts (mosaic)
Top: a heading of two to four words at clamp(40px, 4vw, 60px) on the left margin, then 24px below it a three-line lead paragraph at 21–22px across columns 1–6. 72px lower, two tiles sit side by side with a 16px gap. The left tile spans columns 1–8: a landscape photograph at 16:10 with one radius (0 or 10px). A short paragraph of up to 35 words at 16px is set in a solid paper-colour block 320px wide with 20px padding, placed over the photograph's top-right corner and flush with both edges. The right tile spans columns 9–12 and is a flat palette colour, 60% of the photograph's height: it holds a simple inline SVG outline of the region or the floor plan as one filled shape, with one solid dot marking the location. Under the colour tile, four label and value pairs at 14px in a two-by-two grid: altitude, distance, season, local time.
On a phone: Heading at 9vw, lead at 18px. The photograph goes full width at 4:3 and its overlaid paragraph moves beneath it as ordinary text. The colour tile follows at full width and 3:2, and the four label and value pairs sit under it in two columns.

Adjusted for this page:
- It sets text at 10px: use your small step (13px or more) instead.

### 5. footer — Photograph half, menu half (split)
A split footer one viewport tall. The left half is a single photograph filling columns 1–6 edge to edge, cropped hard by the left and bottom viewport edges: a close crop of the page's main subject, larger than it appeared anywhere above. The right half, on a flat field, is the site's menu set large: five or six section names stacked as links at about 2.6vw bold, 28px apart, starting at column 8 and 80px from the top. Rows are separated by space only; on hover a row's label shifts right by 12px and the others drop to the softer ink. Under the menu, 64px lower, two short blocks at 15px side by side: contact and social. The legal line runs along the very bottom of the right half at 12px. The wordmark sits small at the top of the right half, on the menu's left edge.
On a phone: The photograph leads at full width and 50svh, cropped tight. The menu follows on the flat field at 8vw per item with 20px between items, then contact and social stacked at 15px, then the legal line at 12px. The wordmark sits small above the menu.

Adjusted for this page:
- It sets text at 12px: use your small step (13px or more) instead.

## 8. Motion — Scaling wordmark
The giant name responds to the scroll: as the first screen leaves, the wordmark scales down a few percent (or grows from 0.94 to 1 as the footer arrives) on a scroll-linked timeline, so the monument feels heavy. Travel stays under 8%. Static fallback where scroll timelines are unsupported. Recipe: 'Scroll-linked progress' in references/motion.md, animating `scale`.
This is the signature move, the one loud moment. Around it the page still needs the rest of the motion layer (SKILL.md step 9): an entrance for the parts of every section, feedback on every control, and one moving picture. The inspector fails a page that barely moves. Recipes: references/motion.md.

## 9. Where the richness comes from
The photographs, at full size, uninterrupted. Empty paper around short text makes the next image land harder.

## 10. How this direction goes wrong
A weak hero photograph cannot be fixed by typography; pick again. Do not stack a headline, a paragraph and two buttons on the image. Do not use a booking bar that covers the bottom of the view; one small action is enough.

## 11. Real references
Studied sites that work this way. Take the principle, never the specifics: no names, copy, images or signature assets of theirs.
- **IZANAMI** (Awwwards Site of the Day, studied score 7) `aww-izanami`
  Idea: Silence as design: one small sentence in fog, then a slow descent from mist into a dark glass pavilion.
  Hero: After a warm-black loader showing only one 18px serif sentence and a small counter, the hero is a full-bleed, desaturated grey-green image of pine forest dissolving into fog. The same sentence stays at 18px in white, left-aligned on a line about 17% from the left edge and exactly at vertical centre; it is the only text in the picture area. A small white seal-style logo sits top-left; a language switch and menu label in tiny tracked capitals sit top-right, each with a dot above. Along the bottom edge: copyright, two live city clocks, and a scroll cue at far right, all near 10px.
  Worth taking: Place a single 18px sentence at vertical centre on an offset left line over full-bleed fog, and let the absence of a headline be the statement.
- **White Desert** (Awwwards Site of the Day, studied score 8.4) `aww-white-desert`
  Idea: One word, the destination, set a third of the screen tall over footage like a film title card; sheer scale stands in for remoteness.
  Hero: Full-bleed video (the view from an aircraft window over an ice shelf, darkly vignetted by the window frame) fills the viewport. Faint vertical hairlines divide it into six columns. Top-left, three outlined rectangular nav buttons about 120 by 40px with 6px gaps; top-right, two more; between them a small white mountain logo over a condensed caps name. One condensed uppercase word spans almost the full width at 17.8vw, white, centred, anchored so its baseline sits about 35px above the bottom edge. At mid-height a two-line italic serif tagline at about 16px hangs on the first column line at left, and a film-play label sits between two hairlines at right.
  Worth taking: Set a single place name in condensed caps at about 18vw, centred and anchored to the bottom edge of full-bleed footage, with everything else on screen at 14-16px.
- **21 Hrs On The Moon** (Awwwards Site of the Day, studied score 7.6) `aww-21-hrs-on-the-moon`
  Idea: An explorable Apollo 11 landing site: a title screen where the word MOON sets behind the lunar horizon, then a draggable top-down surface map with hotspots and a mission timeline.
  Hero: Black starfield framed by thin bronze corner brackets; three small round icon buttons top-left. A centred composition 72% wide sits between two thin rules. The upper rule is interrupted by a small bold caps kicker; beneath it the four-letter title in bold geometric caps at 20.8vw spans the full width, light grey fading to transparent at its base. A grey cratered sphere rises from the bottom, its curved horizon overlapping the lower quarter of the letters. On the sphere: a two-line centred white sentence, with a mono-labelled mission name at far left and year at far right above the lower rule. A bracketed mono button sits centred at 82% height.
  Worth taking: Let a 3D or photographic object physically overlap the bottom of giant title letters and fade the letters to transparent there, so the type sits inside the scene rather than on top of it.
Full notes on any of them: `node draw.mjs --site <id>`.

## Always
Headlines two lines or fewer at every width. No eyebrow labels, no monospace, no 01/02/03, no thin rules, no gradients, no shadows at rest,
no cream-and-terracotta, no violet. `inspect.mjs` measures all of it.

Saved to /workspace/nova-cinema-skills-thanh-phong/.taste-skill/direction.json · reprint with `node draw.mjs --show`
