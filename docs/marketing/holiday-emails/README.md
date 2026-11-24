# Christmas e-mails: The Tree Tag

Two e-mails, each in English and Spanish, for the owner to send from **Mailchimp**. Offer e-mails never go
through Resend (Resend is for the site's own account e-mails). Nothing here sends itself.

| File | Subject | Send on | Button goes to |
|---|---|---|---|
| `christmas-offer.en.html` | A gift that opens on Christmas morning | 10 December | `https://tryethos.io/occasions/christmas?ref=email-xmas` |
| `christmas-offer.es.html` | Un regalo que se abre la mañana de Navidad | 10 December | `https://tryethos.io/es/occasions/christmas?ref=email-xmas` |
| `christmas-last-day.en.html` | The Tree Tag ends tonight | 20 December | `…/occasions/christmas?ref=email-xmas-last` |
| `christmas-last-day.es.html` | La etiqueta del árbol termina esta noche | 20 December | `…/es/occasions/christmas?ref=email-xmas-last` |

**Who gets them:** the people who asked for offer e-mails (the "Email me Ethos offers" box), the
same audience as November's offer e-mails. The Spanish version goes to subscribers whose language is Spanish;
if the audience records no language, send the English one to everyone.

**The last day is real.** The Tree Tag comes with every paid gift (its template unlocked for the sender) whose
first send falls between 24 November and the end of 20 December anywhere on earth (`src/lib/lifecycle/holiday-extras.ts`:
the first instant after is 21 December 12:00 UTC). It is decided once, at that first send, and stamped on the gift:
a gift made after gets no tag, an older gift sent again gets none, and a gift that has it keeps it after any edit.
Free gifts (the free Letter or note, a free reply, a creator-campaign gift) get no tag, so both e-mails say "paid".
The tag is offered on the share screen and the gift's page until the end of 25 December. Send the last-day
e-mail on the morning of the 20th so "tonight" is true where the reader is.

**It ships switched off.** Nothing is stamped or offered until `NEXT_PUBLIC_TREE_TAG=1` is set in Vercel
(Production) and the site is redeployed. Gifts first sent before that get no tag, so switch it on before the
offer e-mail goes out, as soon as the owner approves the offer. Unset, the live site works exactly as before.

## Before either e-mail is sent

1. **The pictures must be live**: `https://tryethos.io/email/tree-tag.png` (English) and
   `https://tryethos.io/email/tree-tag-es.png` (Spanish). They ship with the site (`public/email/`). Open
   both addresses in a browser first; an e-mail sent before they are live shows a broken image.
2. The site's e-mail icon, `https://tryethos.io/icon-email.png`, is already live.
3. The Tree Tag itself must be live and switched on (`NEXT_PUBLIC_TREE_TAG=1`, above), or the e-mail promises
   something the site does not give.
4. A printed sheet has been scanned: print one A4 sheet on the cream paper and one on sage, hang one tag about
   1 m away, and scan it with an iPhone camera and an Android camera. Not yet done.

## In Mailchimp

- New campaign, "Code your own", paste the whole HTML file. Subject from the table above. The preview line is
  already in the file (the hidden first line); leave Mailchimp's own preview text empty.
- The footer uses Mailchimp's merge tags: `*|UNSUB|*` (the unsubscribe link) and `*|LIST:ADDRESSLINE|*` (the
  postal address the law asks for). Mailchimp fills both in; a test send shows them filled.
- Send a test to yourself and open it on a phone before scheduling.

Each file is one table, 520 px wide, inline styles only, on the paper colour, heading, rose button and footer
of the site's own e-mails (`src/emails/layout.tsx`). Each file loads two images and nothing else.
