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

**The last day is real.** The Tree Tag comes with every paid gift made from 24 November until the end of 20
December anywhere on earth (`src/lib/lifecycle/holiday-extras.ts`, last instant 21 December 12:00 UTC). A
gift made after that gets no tag; a gift that has it keeps it. Send the last-day e-mail on the morning of the
20th so "tonight" is true where the reader is.

## Before either e-mail is sent

1. **The pictures must be live**: `https://tryethos.io/email/tree-tag.png` (English) and
   `https://tryethos.io/email/tree-tag-es.png` (Spanish). They ship with the site (`public/email/`). Open
   both addresses in a browser first; an e-mail sent before they are live shows a broken image.
2. The site's e-mail icon, `https://tryethos.io/icon-email.png`, is already live.
3. The Tree Tag itself (the print page, and the row under the QR card) must be live, or the e-mail promises
   something the site does not give.

## In Mailchimp

- New campaign, "Code your own", paste the whole HTML file. Subject from the table above. The preview line is
  already in the file (the hidden first line); leave Mailchimp's own preview text empty.
- The footer uses Mailchimp's merge tags: `*|UNSUB|*` (the unsubscribe link) and `*|LIST:ADDRESSLINE|*` (the
  postal address the law asks for). Mailchimp fills both in; a test send shows them filled.
- Send a test to yourself and open it on a phone before scheduling.

Each file is one table, 520 px wide, inline styles only, on the paper colour, heading, rose button and footer
of the site's own e-mails (`src/emails/layout.tsx`). Each file loads two images and nothing else.
