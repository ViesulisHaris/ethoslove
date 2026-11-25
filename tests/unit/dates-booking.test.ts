import { describe, expect, it } from "vitest";
import { bookingLink, parseBookingPartner } from "@/lib/dates/booking";
import { detailsFromTags } from "@/lib/dates/details";

// "Book a table" (BRIEF-dates2.md 5): the plain address until a partner's id is set, and marked
// sponsored only when that id was added.

const PARTNER = "opentable.com?ref=1234";

describe("booking links", () => {
  it("B1 no variable: the plain address, not sponsored", () => {
    expect(bookingLink("https://www.opentable.com/r/casa-x")).toEqual({ href: "https://www.opentable.com/r/casa-x", sponsored: false });
    expect(bookingLink("https://book.example.org/table", undefined)).toEqual({ href: "https://book.example.org/table", sponsored: false });
  });

  it("B2 the partner's host and a subdomain of it get the id and are sponsored", () => {
    expect(bookingLink("https://opentable.com/r/casa-x", PARTNER)).toEqual({ href: "https://opentable.com/r/casa-x?ref=1234", sponsored: true });
    expect(bookingLink("https://www.opentable.com/r/casa-x", PARTNER)).toEqual({ href: "https://www.opentable.com/r/casa-x?ref=1234", sponsored: true });
    expect(bookingLink("https://de.opentable.com/r/casa-x", PARTNER)?.sponsored).toBe(true);
  });

  it("B3 another host is left alone and not sponsored", () => {
    expect(bookingLink("https://example.com/book", PARTNER)).toEqual({ href: "https://example.com/book", sponsored: false });
    // A host that only ends with the partner's name is not the partner.
    expect(bookingLink("https://notopentable.com/r/x", PARTNER)).toEqual({ href: "https://notopentable.com/r/x", sponsored: false });
  });

  it("B4 a query the address already had is kept", () => {
    const link = bookingLink("https://www.opentable.com/r/casa-x?covers=2&lang=en", PARTNER);
    expect(link?.sponsored).toBe(true);
    const url = new URL(link!.href);
    expect(url.searchParams.get("covers")).toBe("2");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("ref")).toBe("1234");
  });

  it("B5 a variable that is not <host>?<param>=<id> is ignored", () => {
    for (const bad of ["", "opentable.com", "?ref=1", "opentable.com?ref", "opentable.com?=1", "not a host?ref=1", "opentable.com?ref=<script>", "javascript:alert(1)?a=b"]) {
      expect(parseBookingPartner(bad)).toBeNull();
      expect(bookingLink("https://www.opentable.com/r/casa-x", bad)).toEqual({ href: "https://www.opentable.com/r/casa-x", sponsored: false });
    }
    expect(parseBookingPartner("www.OpenTable.com?ref=1234&src=ethos")).toEqual({ host: "opentable.com", params: [["ref", "1234"], ["src", "ethos"]] });
  });

  it("B6 a javascript: address, an empty one and undefined give null", () => {
    expect(bookingLink("javascript:alert(1)", PARTNER)).toBeNull();
    expect(bookingLink("", PARTNER)).toBeNull();
    expect(bookingLink("   ")).toBeNull();
    expect(bookingLink(undefined)).toBeNull();
    expect(bookingLink("ftp://example.com/file")).toBeNull();
    expect(bookingLink("https://localhost/book")).toBeNull();
  });

  it("B7 detailsFromTags reads each of the four tags and refuses one that is not an address", () => {
    for (const tag of ["website:booking", "booking:website", "contact:booking", "reservation:url"]) {
      expect(detailsFromTags("node/1", { [tag]: "https://example.com/book" }).booking).toBe("https://example.com/book");
    }
    expect(detailsFromTags("node/1", { "website:booking": "call us" }).booking).toBeUndefined();
    expect(detailsFromTags("node/1", { "website:booking": "javascript:alert(1)" }).booking).toBeUndefined();
    expect(detailsFromTags("node/1", {}).booking).toBeUndefined();
  });
});
