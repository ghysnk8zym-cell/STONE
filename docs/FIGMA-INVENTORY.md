# Figma inventory

**File:** `1vEGuD9cYYFNynyByUGHwF` (read-only in this workstream)
**Read on:** 2026-10-13 with the official Figma MCP (`get_metadata`, `get_variable_defs`, `get_screenshot`). No writes.
**Design history:** STONE agent system evidence D010–D050, H100, C100, R200 (`C:/Users/nartsiss/Documents/Codex/2026-10-03/prompt-engineer-llm-engineer-ai-system/outputs/stone-agent-system/evidence/`).

This inventory lists what exists. It does not by itself approve any screen as final; per-phase specs confirm the exact frames to implement.

## 1. Pages

| Page id  | Name                        | Use                           |
| -------- | --------------------------- | ----------------------------- |
| `5:2`    | Cover                       | —                             |
| `19:120` | Components                  | Component masters (section 3) |
| `0:1`    | Design — Responsive         | All screens (section 2)       |
| `5:4`    | Specs & handoff             | Reference                     |
| `5:6`    | Archive — previous versions | Not a source of truth         |

## 2. Screens (page `0:1`)

Breakpoint columns are frame widths. The web build targets 1440, 1024, 768 and 390 (360 and 1920 used as extra checks).

| Screen                    | 1920         | 1440         | 1024         | 768          | 390          | 360          |
| ------------------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ------------ |
| Home                      | `25:110`     | —            | —            | —            | —            | —            |
| Create account            | `840:21796`  | `431:3193`   | `840:21822`  | `840:21848`  | `431:3250`   | `840:21874`  |
| Home v2                   | `714:869`    | `722:1300`   | `722:1563`   | `724:1669`   | `716:1060`   | `724:1975`   |
| Account                   | `733:4803`   | `736:5318`   | `736:5449`   | `737:6274`   | `737:6405`   | `737:6643`   |
| Account / Orders          | `734:4966`   | `742:7324`   | `742:7471`   | `742:7607`   | `742:7736`   | `742:7893`   |
| Account / Favorites       | `734:5118`   | `742:11470`  | `742:11703`  | `742:11927`  | `742:12144`  | `742:12388`  |
| Account / Profile         | `734:5448`   | `742:16191`  | `742:16320`  | `742:16440`  | `742:16557`  | `742:16700`  |
| Product / Black Marble    | `780:11881`  | `782:11526`  | `782:11577`  | `782:11639`  | `782:11727`  | `782:11850`  |
| Product / Grey Limestone  | `784:13598`  | `784:13722`  | `784:13846`  | `784:13961`  | `784:14077`  | `784:14219`  |
| Product / Grey Marble     | `784:14361`  | `784:14485`  | `784:14609`  | `784:14724`  | `784:14840`  | `784:14982`  |
| Product / Taupe Rock      | `784:15124`  | `784:15248`  | `784:15372`  | `784:15487`  | `784:15603`  | `784:15745`  |
| Product / Graphite Rock   | `784:15887`  | `784:16011`  | `784:16135`  | `784:16250`  | `784:16366`  | `784:16508`  |
| Product / Split Limestone | `784:17848`  | `784:17972`  | `784:18096`  | `784:18211`  | `784:18327`  | `784:18469`  |
| Product / Concrete Paver  | `784:18611`  | `784:18735`  | `784:18859`  | `784:18974`  | `784:19090`  | `784:19232`  |
| Product / Golden Rock     | `784:19374`  | `784:19498`  | `784:19622`  | `784:19737`  | `784:19853`  | `784:19995`  |
| Product / Charcoal Ledger | `784:20137`  | `784:20261`  | `784:20385`  | `784:20500`  | `784:20616`  | `784:20758`  |
| Product / Graphite Stack  | `784:20972`  | `784:21096`  | `784:21220`  | `784:21335`  | `784:21451`  | `784:21593`  |
| Product / Silver Ledger   | `784:21735`  | `784:21859`  | `784:21983`  | `784:22098`  | `784:22214`  | `784:22356`  |
| Product / Rustic Split    | `784:22498`  | `784:22622`  | `784:22746`  | `784:22861`  | `784:22977`  | `784:23119`  |
| Sign out                  | `799:20451`  | `803:20474`  | `803:20527`  | `803:20571`  | `803:20615`  | `803:20659`  |
| Create Your Stone         | `849:22220`  | `849:23559`  | `849:23796`  | `849:24021`  | `849:24247`  | `849:24505`  |
| Catalog                   | `918:25304`  | `922:25494`  | `922:25741`  | `922:25976`  | `922:26324`  | `922:26811`  |
| Our works                 | `1038:46591` | `1039:46770` | `1039:47099` | `1039:47427` | `1039:47756` | `1039:48126` |
| Admin / Overview          | `1061:50362` | `1077:51932` | `1077:55042` | —            | —            | —            |
| Admin / Orders            | `1062:50528` | `1077:52201` | `1077:55311` | —            | —            | —            |
| Admin / Products          | `1069:50712` | `1077:52506` | `1077:55616` | —            | —            | —            |
| Admin / Add product       | `1070:51112` | `1077:52622` | `1077:55732` | —            | —            | —            |
| Admin / Create Your Stone | `1071:51253` | `1077:52818` | `1077:55928` | —            | —            | —            |
| Admin / Customers         | `1072:51409` | `1077:53004` | `1077:56114` | —            | —            | —            |
| Admin / Promotions        | `1073:51565` | `1077:53224` | `1077:56321` | —            | —            | —            |
| Admin / Site content      | `1074:51769` | `1077:53429` | `1077:56526` | —            | —            | —            |

### Other top-level frames on 0:1

| Node       | Name                              | Size    |
| ---------- | --------------------------------- | ------- |
| `613:3212` | Catalog refined/Dropdown Material | 300×316 |
| `613:3239` | Catalog refined/Dropdown Color    | 300×266 |
| `613:3262` | Catalog refined/Dropdown Finish   | 300×316 |
| `613:3289` | Catalog refined/Dropdown Sort     | 300×166 |
| `613:3304` | Catalog refined/Dropdown Search   | 300×316 |
| `613:3330` | Catalog refined/Filters · 390     | 390×736 |
| `627:4550` | Catalog refined/Filters · 360     | 360×724 |
| `627:4634` | Catalog refined/Filters · 320     | 320×724 |

### Device QA sections

| Node         | Name                                  |
| ------------ | ------------------------------------- |
| `725:2049`   | Device QA — Home                      |
| `736:5591`   | Device QA — Account                   |
| `742:8050`   | Device QA — Account / Orders          |
| `742:12632`  | Device QA — Account / Favorites       |
| `742:16843`  | Device QA — Account / Profile         |
| `783:12048`  | Device QA — Product                   |
| `804:20553`  | Device QA — Sign out                  |
| `840:23060`  | Device QA — Create account            |
| `849:24763`  | Device QA — Create Your Stone         |
| `926:26453`  | Device QA — Catalog                   |
| `1012:29473` | Device QA — Product / Grey Limestone  |
| `1013:31031` | Device QA — Product / Grey Marble     |
| `1013:33138` | Device QA — Product / Taupe Rock      |
| `1013:35245` | Device QA — Product / Graphite Rock   |
| `1013:37352` | Device QA — Product / Split Limestone |
| `1014:37263` | Device QA — Product / Concrete Paver  |
| `1014:39370` | Device QA — Product / Golden Rock     |
| `1014:41477` | Device QA — Product / Charcoal Ledger |
| `1014:43584` | Device QA — Product / Graphite Stack  |
| `1014:45691` | Device QA — Product / Silver Ledger   |
| `1014:47798` | Device QA — Product / Rustic Split    |
| `1040:47548` | Device QA — Our works                 |
| `1078:54288` | Device QA — Admin                     |

`Home — 1920` (`25:110`) is the previous home; **Home v2** is treated as canonical (to confirm in the Phase 3 spec).

## 3. Components (page `19:120`)

States follow the D020/D030 contract: Default, Hover, Focus, Pressed (RippleStart/RippleEnd in Figma), Disabled, plus Reduced-motion variants.

| Component set                                                   | Node                                          | Variants / states                                                                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                                                          | `22:42`                                       | Layout=Full `22:17`, Layout=Compact `22:30`; Header/Full + Account `732:539`                                                                                                                               |
| Footer                                                          | `22:104`                                      | Layout=Desktop `22:53`, Layout=Mobile `22:80`                                                                                                                                                              |
| Nav/Pill                                                        | `21:79`                                       | Default, Hover, Focus, RippleStart, RippleEnd, Disabled, Reduced, ReducedHover, ReducedPressed, Current                                                                                                    |
| Nav/Dropdown                                                    | `156:150`                                     | Default, Hover, Expanded, Selected, Focus, Disabled, Ripple×2, Reduced×3                                                                                                                                   |
| Menu/Panel (mega-menu)                                          | `176:272`                                     | Type=Material `176:176`, Type=Color `176:226`                                                                                                                                                              |
| Menu/Mini (hover panels)                                        | `216:478`                                     | Gallery `216:382`, Calculator `216:408`, Custom Design `216:434`, Cart `216:460`                                                                                                                           |
| Menu/Row                                                        | `159:185`                                     | Desktop/Mobile × Default, Hover, Focus, Ripple×2, Reduced                                                                                                                                                  |
| Nav/Tab bar · Nav/Tab item                                      | `712:499` · `712:498`                         | Active, Default (mobile bottom bar)                                                                                                                                                                        |
| Button/Pill                                                     | `21:95`                                       | Default, Hover, Focus, Ripple×2, Disabled, Reduced×3                                                                                                                                                       |
| Button/Primary                                                  | `338:533`                                     | Default, Hover, Pressed, Focus, Disabled                                                                                                                                                                   |
| Button/Light                                                    | `430:479`                                     | Default, Hover, Pressed, Focus                                                                                                                                                                             |
| Button/Outline · Button/Graphite · Button/Save                  | `732:712` · `733:6134` · `779:546`            | single                                                                                                                                                                                                     |
| Icon button                                                     | `21:125`                                      | Menu, Close, Back, User × states                                                                                                                                                                           |
| Social/Button                                                   | `21:115`                                      | Default, Hover, Focus, Ripple×2, Disabled, Reduced×3                                                                                                                                                       |
| Search/Pill                                                     | `21:108`                                      | Tone=Light / Graphite × states, Open, OpenUp                                                                                                                                                               |
| Carousel/Arrow                                                  | `712:489`                                     | Prev, Next                                                                                                                                                                                                 |
| Card/Showcase                                                   | `713:561`                                     | Product / Promo / Work × Desktop / Mobile                                                                                                                                                                  |
| Card/Catalog product                                            | `337:556`                                     | Default, Hover, Pressed, Focus                                                                                                                                                                             |
| Card/Product · Card/Material · Card/Color                       | `159:304` · `159:232` · `159:265`             | Default, Hover, Focus (Product: Large/Small)                                                                                                                                                               |
| Card (legacy)                                                   | `22:52`                                       | Promo, Work                                                                                                                                                                                                |
| Catalog/Empty · Catalog/Custom order CTA                        | `159:309` · `933:30637`                       | — · Desktop/Mobile                                                                                                                                                                                         |
| Filter/Chip · Filter/Swatch · Chip/Applied · Chip/Applied light | `158:164` · `158:242` · `158:278` · `338:546` | state sets                                                                                                                                                                                                 |
| Field/Select · Option/Row                                       | `338:507` · `346:477`                         | Default, Hover, Open, Focus · Default, Hover                                                                                                                                                               |
| Input/Dark                                                      | `430:504`                                     | Default, Focus                                                                                                                                                                                             |
| Product/Breadcrumb · Spec row · Field                           | `779:529` · `779:533` · `779:541`             | —                                                                                                                                                                                                          |
| Product/Calculator                                              | `779:628`                                     | Mode=Area `779:547`, Mode=Wall dimensions `779:584`                                                                                                                                                        |
| Hero/Scene                                                      | `296:531`                                     | Layout=1920, 1440 `21:27`, 1280, 1024, 768, 390, 360                                                                                                                                                       |
| Account/Nav button                                              | `732:568`                                     | Default, Hover, Pressed, Selected                                                                                                                                                                          |
| Account blocks                                                  | `818:537`–`819:585`                           | Avatar (Stone/Milk), User block, Status chip (In progress/Delivered), Block header, Bell button, Order row, Orders block, Favorite tile, Favorites block                                                   |
| Form (Create Your Stone)                                        | `848:672` · `848:828` · `848:915`             | Step header, Upload zone, File row                                                                                                                                                                         |
| Works                                                           | `1036:598` · `1036:607`                       | Source chip, Stat                                                                                                                                                                                          |
| Admin/Button · Admin/Field                                      | `1060:648` · `1060:649`                       | Primary, Secondary                                                                                                                                                                                         |
| Admin/Status chip                                               | `1060:681`                                    | New, Draft, New custom request, Draft quote, Processing, Awaiting payment, Paid, Fulfilled, Published, Order fulfilled, Not started                                                                        |
| Admin/Sidebar                                                   | `1060:52244`                                  | Active = Overview … Site content                                                                                                                                                                           |
| Admin/Product card                                              | `1067:985`                                    | —                                                                                                                                                                                                          |
| Icons                                                           | `21:55`… `1060:637`                           | Search, Menu, Close, Arrow, Bag, Chevron, Check, Dismiss, Back, Heart, Home, Grid, User, Orders, Support, Sign out, Bell, Chevron right, Upload, Box, Diamond, Users, Tag, Calendar, Plus, Desktop, Mobile |
| Texture/imagery library                                         | `154:101`, `710:*`, `778:*`                   | Demo imagery (generated)                                                                                                                                                                                   |

State boards for the open mega-menu: `200:278` (Material), `200:356` (Color), `223:502` (Gallery hover panel).

## 4. Planned route map

| Route (`/[locale]/…`)                                                                                                                                   | Figma screen                                           | Access        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `` (home)                                                                                                                                               | Home v2                                                | Guest         |
| `catalog`                                                                                                                                               | Catalog (+ Catalog refined dropdowns/filters)          | Guest         |
| `catalog/[slug]`                                                                                                                                        | Product / * (12 products, includes Product/Calculator) | Guest         |
| `create-your-stone`                                                                                                                                     | Create Your Stone                                      | Guest         |
| `works`                                                                                                                                                 | Our works                                              | Guest         |
| `sign-up`                                                                                                                                               | Create account                                         | Guest         |
| `sign-in`                                                                                                                                               | **gap** (see 5.1)                                      | Guest         |
| `sign-out`                                                                                                                                              | Sign out (confirmation)                                | Client, Admin |
| `account`, `account/orders`, `account/favorites`, `account/profile`                                                                                     | Account, Account / Orders, / Favorites, / Profile      | Client, Admin |
| `admin`, `admin/orders`, `admin/products`, `admin/products/new`, `admin/create-your-stone`, `admin/customers`, `admin/promotions`, `admin/site-content` | Admin / *                                              | Admin         |

## 5. Gaps and open points (resolved per phase, never invented without approval)

1. **Sign in** screen is missing; only Create account exists (R200 spec mentions a "smallest Sign in demonstration").
2. **Cart / Checkout** screens are not on page `0:1` (older Cart frames referenced in evidence, e.g. `123:1104`, are no longer present there).
3. **About company** has a preview in R200 evidence but no frame on `0:1`.
4. **Admin** exists only at 1920/1440/1024; no 768/390/360 layouts.
5. **Navigation mismatch:** Home v2 header shows "Create Your Stone", "Cart" and an account icon, while Header Layout=Full plus Menu/Panel and Menu/Mini describe Gallery / Calculator / Custom Design / Cart with hover mega-menus (D030). The current navigation model must be confirmed before Phase 2 navigation work.
6. **Language switch** is absent (owner decided: a button built from Nav/Pill; approval in Phase 2).
7. **Cyrillic:** Lusitana has no Cyrillic; fallback PT Serif (ADR-003), approval in Phase 2.
8. **Error pages** (403, 404, 500) are absent.
9. **Pricing:** Home promo cards show demo prices (e.g. $32.00 / m²), the calculator uses USD 240/m²; all prices are placeholders.
10. Figma page listing via `get_metadata` without a node id returned only `Cover`; pages are readable by id (`0:1`, `19:120`).
