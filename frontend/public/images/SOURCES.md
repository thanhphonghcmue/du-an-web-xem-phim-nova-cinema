# Image sources

Remote primary movie images: TMDB (`https://image.tmdb.org/t/p/`); paths are defined in `src/data.js`. Film artwork belongs to its respective rights holders.

Local fallbacks were sourced from publicly accessible copies because the onboarding machine blocks the TMDB image host. Only image files were copied; no external repository code was executed or incorporated.

- `dune-poster.jpg`: Dune: Part Two poster, https://github.com/BegzatMamatkarimov/Movie_poster/blob/e0ee4547349d7971a7c2ff68ed0e669eab3e581b/posters/dune-2.jpg
- `dune-scene.jpg`: Dune: Part Two film still, https://github.com/kaahndemir/dune-part-two-wallpapers/blob/7f5e28e09f7dc45e0df0886a53656a679b0de46c/mpv-shot0078.jpg
- `exhuma-poster.jpg`: Exhuma film poster, https://github.com/hyuna99323/exhuma/blob/c7f1a999c7c116849d9d2b8d793b971ffa9d9891/img/exhuma_posterFull.jpeg
- `oppenheimer-art.jpg`: Oppenheimer promotional artwork, https://github.com/alicodetayyeb/Oppenheimer-Website/blob/19dd1ef13bfadc007f45e8d3612f0a1609411f8d/op.jpg
- `panda-poster.jpg`: Kung Fu Panda 4 poster, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/Admin/img/kungfu-panda-4.jpg
- `kong-art.jpg`: Godzilla x Kong promotional artwork, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/Admin/img/god-x-kong-750_1711942287259.jpg
- `kong-banner.jpg`: Godzilla x Kong banner, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/assets/images/slider/kong.jpg

Availability of a public copy does not confer commercial use rights. Review licensing with rights holders before a commercial release. Local popcorn/drink visuals are original CSS illustrations.

- `interstellar-poster.jpg`: Interstellar poster, https://github.com/BegzatMamatkarimov/Movie_poster/blob/e0ee4547349d7971a7c2ff68ed0e669eab3e581b/posters/interstellar.jpg
- `batman-poster.jpg`: The Dark Knight poster, https://github.com/BegzatMamatkarimov/Movie_poster/blob/e0ee4547349d7971a7c2ff68ed0e669eab3e581b/posters/the-dark-knight.jpg

- `mai-title.svg`: original typographic title art created for this demo. This is not an official Mai poster.
- `cinema-auditorium.jpg`: illustrative Galaxy Cinema auditorium, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/assets/images/ohayou/galaxy-da-nang-3_1698052210667.jpg
- `cinema-imax.jpg`: illustrative Galaxy Cinema interior, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/assets/images/ohayou/galaxy-da-nang-4_1698052214666.jpg
- `cinema-lobby.jpg`: illustrative Galaxy Cinema lobby, https://github.com/ywhnaht/CinemaWeb/blob/fe9a290f4d5d1282fce2e6cb17cbcc4f6523a282/assets/images/ohayou/galaxy-da-nang-5_1698052220835.jpg

These venue photographs are references, not photographs of real NOVA properties.

## NOVA Discovery catalog

The 18 additional files in `posters/` are film posters from the `posters/` directory of
https://github.com/BegzatMamatkarimov/Movie_poster/tree/e0ee4547349d7971a7c2ff68ed0e669eab3e581b/posters.
Only those image blobs were copied; no source code or executable artifacts from that repository were used.
Titles, release years and directors describe the original films. The upcoming dates in the NOVA catalog
are a proposed demo re-screening program, not official film release announcements.

All 16 illustrations in `menu/` are original SVG drawings made for NOVA: popcorn boxes, drinks,
hotdog, fries and nachos. They use NOVA branding and are not Cinestar promotional material.

## Product photography update — 28 October 2026

The generated sprite, generated sharing hero, generated dream-city artwork and generated movie-night campaign have been **removed**. Earlier design reports and screenshots describe the historical implementation; those assets are no longer served by the application.

Current food photographs are stored unmodified in `food-photography/`. The precise upstream repository revision and path for each file is listed in [sources.json](food-photography/sources.json). No generative image tools, recolouring or invented NOVA packaging were used for this update. The chicken detail frames the lower-left chicken portion of an existing menu photograph using CSS; the original file remains unchanged.

Sources:

- [tomiabe/wpp](https://github.com/tomiabe/wpp): existing What's Poppin product flavour photographs and sharing-counter photo.
- [JohnatanAccourt/Popcorn_Ecommerce](https://github.com/JohnatanAccourt/Popcorn_Ecommerce): generic popcorn bucket photograph present in the December 2020 source.
- [KhoaNguyen22/cinestar-at-home](https://github.com/KhoaNguyen22/cinestar-at-home): existing cola and bottled-water product photos.
- [ProgrammingHero1/tea-house-resources](https://github.com/ProgrammingHero1/tea-house-resources): existing fruit tea, citrus tea and berry drink reference photos.
- [ju5tyn/hotdog-shop](https://github.com/ju5tyn/hotdog-shop): existing hotdog photograph.
- [Ikuewumi/nachos](https://github.com/Ikuewumi/nachos): existing nachos photograph.
- [terryhycheng/mcdonalds-menu-web](https://github.com/terryhycheng/mcdonalds-menu-web): existing fries product photograph.
- [Dayveed14/McDonalds-Clone](https://github.com/Dayveed14/McDonalds-Clone): existing menu photograph containing chicken pieces.

These are references for the student-project menu, not photographs of NOVA-manufactured products or an assertion that NOVA operates the source businesses. Quantities and ingredients are stated in the menu text. Visible third-party packaging remains unchanged. A public repository's software license does not automatically license third-party food photography or trademarks; attribution records the source and does not assert commercial clearance.

UI references: [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT card/spacing principles), existing [Radix UI](https://github.com/radix-ui/primitives) controls and native CSS Grid. External application code, servers and installation scripts were not executed or imported into the booking backend.
