import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { SITE_URL } from "@/config/site";
import { BRAND } from "@/config/brand";

// The from address is a sending domain, not the contact address: Resend only sends from a
// domain it has verified (see docs/EMAIL.md). Replies go to the contact address.
export const EMAIL_BRAND = { name: "Ethos", site: SITE_URL, from: process.env.EMAIL_FROM || `${BRAND.name} <hello@${BRAND.domain}>` };

const paper = "#FAF7F2";
const ink = "#1A1614";
// The site's rose (--brand-coral), which carries white type at 4.6:1.
const coral = "#d6336c";
const muted = "#6F665F";

/** `footerLink` is the way out of an optional email (unsubscribe, remove a reminder), kept beside why it was sent. */
/** `lang`: the email's language, for mail apps and screen readers; English when not given. */
export function EmailLayout({
  preview,
  heading,
  children,
  cta,
  footer,
  footerLink,
  lang = "en",
}: {
  preview: string;
  heading: string;
  children: ReactNode;
  cta?: { label: string; href: string };
  footer: string;
  footerLink?: { label: string; href: string };
  lang?: "en" | "es";
}) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, background: paper, fontFamily: "Inter, -apple-system, Segoe UI, sans-serif", color: ink }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 24px 32px" }}>
          <Section style={{ marginBottom: 28 }}>
            <Img src={`${EMAIL_BRAND.site}/icon-email.png`} width="36" height="36" alt={EMAIL_BRAND.name} style={{ display: "block" }} />
          </Section>
          <Heading as="h1" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontStyle: "italic", fontWeight: 400, fontSize: 30, lineHeight: 1.15, margin: "0 0 18px", letterSpacing: -0.3 }}>
            {heading}
          </Heading>
          <Section style={{ fontSize: 16, lineHeight: 1.6, color: ink }}>{children}</Section>
          {cta ? <CtaButton href={cta.href} label={cta.label} /> : null}
          <Hr style={{ borderColor: "#E6DFD4", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, lineHeight: 1.6, color: muted, margin: 0 }}>
            {footer}
            {footerLink ? (
              <>
                {" "}
                <Link href={footerLink.href} style={{ color: muted, textDecoration: "underline" }}>
                  {footerLink.label}
                </Link>
              </>
            ) : null}{" "}
            · <Link href={EMAIL_BRAND.site} style={{ color: muted }}>{EMAIL_BRAND.site.replace(/^https?:\/\//, "")}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** The email's one button. EmailLayout puts it after the text; an email that leads to it from the middle (an idea, then "make it") places it itself. */
export const CtaButton = ({ href, label }: { href: string; label: string }) => (
  <Section style={{ margin: "28px 0 8px" }}>
    <Button href={href} style={{ background: coral, color: "#FFF8F4", borderRadius: 999, padding: "13px 22px", fontWeight: 600, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
      {label}
    </Button>
  </Section>
);

export const P = ({ children }: { children: ReactNode }) => <Text style={{ margin: "0 0 14px", fontSize: 16, lineHeight: 1.6 }}>{children}</Text>;
export const Quiet = ({ children }: { children: ReactNode }) => <Text style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: muted }}>{children}</Text>;
/** A link inside body text, in the ink colour so it reads as part of the sentence. */
export const InlineLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} style={{ color: ink, textDecoration: "underline" }}>
    {children}
  </Link>
);
/**
 * One template, suggested by name: its poster, what it is, and a link straight into its editor. A
 * template's own poster and words only, never anything from a gift someone made.
 */
export const Idea = ({ name, tagline, href, poster }: { name: string; tagline: string; href: string; poster: string }) => (
  <Section style={{ margin: "4px 0 6px", background: "#FFFFFF", border: "1px solid #E6DFD4", borderRadius: 16, padding: 14 }}>
    <Row>
      <Column style={{ width: 96, verticalAlign: "top" }}>
        <Link href={href}>
          <Img src={poster} width="84" height="129" alt={name} style={{ display: "block", borderRadius: 10 }} />
        </Link>
      </Column>
      <Column style={{ verticalAlign: "top", paddingLeft: 14 }}>
        <Text style={{ margin: "2px 0 4px", fontSize: 17, lineHeight: 1.35, fontWeight: 600 }}>
          <Link href={href} style={{ color: ink, textDecoration: "none" }}>
            {name}
          </Link>
        </Text>
        <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: muted }}>{tagline}</Text>
      </Column>
    </Row>
  </Section>
);

/** Something to copy exactly: an invite link, a code. */
export const Mono = ({ children, large = false }: { children: ReactNode; large?: boolean }) => (
  <Text style={{ margin: "0 0 14px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: large ? 24 : 14, letterSpacing: large ? 3 : 0, lineHeight: 1.5, wordBreak: "break-all", ...(large ? { background: "#FFFFFF", border: "1px solid #E6DFD4", borderRadius: 12, padding: "14px 18px", display: "inline-block" } : {}) }}>
    {children}
  </Text>
);
