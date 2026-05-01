import { describe, it, expect } from "vitest";
import { assertNoTemplatePlaceholders } from "../safety";

describe("assertNoTemplatePlaceholders", () => {
  it("passes for clean payload", () => {
    expect(() =>
      assertNoTemplatePlaceholders(
        { available_slots: [{ time: "10:00", date: "2026-05-04" }] },
        "test",
      ),
    ).not.toThrow();
  });

  it("throws when {{placeholder}} is present in a string value", () => {
    expect(() =>
      assertNoTemplatePlaceholders(
        { confirmation_message: "Bienvenue chez {{tenant_name}}" },
        "book_appointment",
      ),
    ).toThrow(/tenant_name/);
  });

  it("throws when placeholder is nested deep in arrays/objects", () => {
    expect(() =>
      assertNoTemplatePlaceholders(
        { data: { items: [{ label: "Slot {{date}}" }] } },
        "check_availability",
      ),
    ).toThrow(/date/);
  });

  it("passes when payload mentions 'tenant_name' as plain text without braces", () => {
    expect(() =>
      assertNoTemplatePlaceholders(
        { note: "tenant_name is just a word here" },
        "test",
      ),
    ).not.toThrow();
  });

  it("includes the context in the thrown error message", () => {
    expect(() =>
      assertNoTemplatePlaceholders(
        { msg: "{{agent_persona}} dit bonjour" },
        "book-appointment-route",
      ),
    ).toThrow(/book-appointment-route/);
  });
});
