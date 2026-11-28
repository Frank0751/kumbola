# KumBola UX audit

Audited 28 November 2026 against the KoomBei UX standard, on branch `feat/ubuntu-font-ui-polish` (font already switched to Ubuntu).

## 1. Summary

The public site makes a strong first impression: one clear promise, a warm local photo, and two obvious calls to action that work at phone width. The weak point is the step right after "Book a pickup". People land on a seven-field account form with errors that flash and disappear, and parts of the form are invisible to screen readers and autofill. Some of the trust details are also wrong: a placeholder support number, and mixed messages about USSD.

**Top three fixes**

1. Replace the placeholder support number (`+233 55 000 0000`) everywhere, or hide it until a real line exists.
2. Make the sign-up form forgiving: errors shown next to each field, linked labels, autofill hints, phone required with a clear format.
3. Cut the hero photo from 3.2 MB to about 100 KB so the first screen loads quickly on prepaid mobile data.

## Fix status (28 November 2026)

| Finding | Status | Checked how |
| --- | --- | --- |
| B1 placeholder support number | Waiting on Frank: real number, or hide it | |
| M1 hero photo | Fixed | Phones on 2x screens load a 71 KB WebP, wide desktops 132 KB (was 3.2 MB) |
| M2 inline errors | Fixed | Empty submit: five field messages, `aria-invalid` linked, focus on first problem, input kept |
| M3 select labels | Fixed | Account type and Municipality comboboxes are named by their labels |
| M4 autocomplete | Fixed | name, tel, email, new-password and street-address set; phone keyboard |
| M5 phone required | Fixed | Same rule in the form and on the server; 11 format cases tested |
| M6 USSD contradiction | Waiting on Frank: is `*920*88#` live? | |
| M7 expectations | Fixed | Customer intro line and "All fields are required"; one column on phones |
| M8 desktop nav | Fixed | Three header links from 1024 px, current page highlighted, no overflow |
| m1 tagline | Fixed | Removed from the header logo (it rendered at about 6 px), kept on the splash |
| m2 terms link | Fixed | Links to `/legal` in a new tab, so the form isn't lost |
| m3 demo grid | Fixed on the PR #3 branch, where the admin demo is removed | |

## 2. Users and core flows audited

| User | What they come to do |
| --- | --- |
| Household or business customer | Book a waste pickup and pay by mobile money |
| Aboboyaa operator (driver) | Sign up, get approved, take jobs, get paid |
| City admin | Monitor collections and operators |

Flows audited:

1. **Discover:** landing page and menu
2. **Book as a new customer:** "Book a pickup", then the create-account form
3. **Sign up as a driver:** the same form with "I drive a tricycle"
4. **Get help:** support contacts in the menu, the legal page and Kumi

## 3. Flow ratings

| Flow | Rating | Why |
| --- | --- | --- |
| Discover | Good | One clear message, one primary call to action, reduced motion respected. Let down by a heavy hero image and nav links hidden on desktop. |
| Book as a new customer | Needs work | Account wall with seven fields, errors only in pop-ups, unlinked labels, no autofill. |
| Sign up as a driver | Okay | Same form issues, but a shorter path for this audience. |
| Get help | Needs work | The advertised WhatsApp and urgent-help number is a placeholder. |

## 4. Findings

### Blockers

**B1. The support number is a placeholder.**
- **Where:** `SUPPORT_PHONE` in `src/lib/constants.ts:9`. It appears in the site menu, on the legal page (`src/components/landing/legal.tsx:38`), and in Kumi's chat ("For urgent issues call...", `src/components/ai/kumi-chat.tsx:494`).
- **Principle:** useful; trust.
- **Who it hurts:** anyone with a missed pickup, a payment problem or a safety issue. They are told to call a number that doesn't exist.
- **Fix:** put the real WhatsApp line in `SUPPORT_PHONE`. Until there is one, hide the number and point people to email.

### Major

**M1. The hero photo is 3.2 MB.**
- **Where:** `src/components/landing/hero.tsx:30`, `public/images/hero-tricycle.jpg` (2752 x 1536). It's served at full size to every phone.
- **Principle:** performance on Ghanaian mobile data; equitable.
- **Who it hurts:** first-time visitors on prepaid bundles and slow 3G. The first screen is slow and costs them data.
- **Fix:** serve compressed WebP or AVIF at phone, tablet and desktop widths (about 60 to 120 KB each) with `next/image`, marked as the priority image.

**M2. Sign-up errors only appear as pop-ups.**
- **Where:** `src/components/auth/auth-dialog.tsx:88-90` (`toast.error`).
- **Principle:** feedback loops; WCAG 3.3.1 Error Identification and 3.3.3 Error Suggestion.
- **Who it hurts:** anyone who misses the pop-up, screen-reader users, and people filling the form slowly. They don't know which field to fix.
- **Fix:** show the message under the field itself, mark the field `aria-invalid`, and move focus to the first field with a problem. Keep the pop-up only for server errors.

**M3. Two dropdowns aren't linked to their labels.**
- **Where:** "Account type" and "Municipality" (`auth-dialog.tsx:245`, `:256`), and "Base municipality" for drivers (`:294`). The `<Label>` has no `htmlFor`, and the select trigger has no matching `id`.
- **Principle:** WCAG 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value.
- **Who it hurts:** screen-reader users, who hear an unnamed combobox.
- **Fix:** give each select trigger an `id` and point the label at it.

**M4. The sign-up fields have no autocomplete hints.**
- **Where:** `auth-dialog.tsx:223-269` (name, phone, email, password, address).
- **Principle:** WCAG 1.3.5 Identify Input Purpose; usable on mobile.
- **Who it hurts:** everyone on a phone, who has to type everything by hand.
- **Fix:** add `autoComplete` values: `name`, `tel`, `email`, `new-password` and `street-address`, plus `inputMode="tel"` on the phone field.

**M5. Phone is optional, but a pickup service depends on it.**
- **Where:** sign-up validation, `auth-dialog.tsx:88`.
- **Principle:** useful.
- **Who it hurts:** customers whose driver can't find them and can't call. Drivers, who waste trips.
- **Fix:** require a phone number for customers and drivers. Accept `0XX XXX XXXX` and `+233` formats and store them in one format. Mark the required fields.

**M6. The site contradicts itself about USSD.**
- **Where:** the hero says "Web app live · USSD *920*88#", which reads as live. The sign-up dialog (`auth-dialog.tsx:320`) and Kumi say USSD is coming soon.
- **Principle:** trust; mental models.
- **Who it hurts:** feature-phone users who dial the code and get nothing.
- **Fix:** if USSD isn't live, change the hero line to "USSD *920*88# coming soon", or remove it until it works.

**M7. "Book a pickup" leads straight to a seven-field account form with no warning.**
- **Where:** the hero and header buttons open `AuthDialog` in sign-up mode.
- **Principle:** mental models; Hick's law; the promise "Trash pickup in minutes".
- **Who it hurts:** first-time customers, who expect to book and find a registration form instead.
- **Fix now:** add a one-line explanation at the top ("Create your free account to book. It takes about a minute, and you get GHS 20 credit.") and mark the required fields.
- **Later:** consider letting people book first and create the account at checkout, which needs backend work.

**M8. The main pages are hidden behind the menu on every screen size.**
- **Where:** `src/components/landing/nav.tsx`. "How it works", "Plans & pricing", "For drivers", "For the city" and "FAQ" only appear inside the menu, even on wide desktop screens.
- **Principle:** serial position effect; key navigation should be visible.
- **Who it hurts:** desktop visitors comparing prices, such as businesses and assembly staff, who have to discover the menu first.
- **Fix:** show "How it works", "Plans & pricing" and "For drivers" as header links from the `lg` breakpoint up, and keep the menu for everything else.

### Minor

**m1. The tagline is too small to read.** "KILL TRASH · KUMASI" under the logo is 9.5 px. Make it at least 11 px, or hide it on small screens.

**m2. The terms line has no links.** "By continuing you agree to KumBola's terms and the ... privacy notice" (`auth-dialog.tsx:316`) doesn't link to `/legal`. People should be able to read what they agree to.

**m3. The demo grid has an odd item.** After the admin demo was removed (PR #3), three demo buttons sit in a two-column grid. Let the last button span both columns, or use three columns on wider screens.

## 5. What couldn't be checked

- **Signed-in customer, driver and admin screens.** They need a working `.env` locally, and I don't enter passwords on the live site. Worth a usability session with two or three real customers and drivers in Kumasi.
- **Mobile Money payment states** (pending, timeout, double tap). These need a Paystack test key.
- **Real slow-network timing and 200% text zoom on a real Android phone.**
- **Automated check:** axe found no hard WCAG 2.2 AA failures on the landing page. It couldn't judge 11 text-contrast cases on the photo and gradients. By eye, the hero text reads well once the entrance animation finishes.
