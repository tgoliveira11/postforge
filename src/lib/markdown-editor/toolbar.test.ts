import { describe, expect, it } from "vitest";
import {
  applyMarkdownToolbarAction,
  insertAtCursor,
  wrapSelection,
  type MarkdownToolbarAction,
} from "@/lib/markdown-editor/toolbar";

describe("markdown editor toolbar helpers", () => {
  it("wrapSelection inserts placeholders when selection is empty", () => {
    const { value } = wrapSelection("hello", 2, 2, "**", "**", "bold text");
    expect(value).toBe("he**bold text**llo");
  });

  it("wraps bold and returns a selection covering only the original text", () => {
    const value = "hello test world";
    const selectionStart = value.indexOf("test");
    const selectionEnd = selectionStart + "test".length;

    const result = applyMarkdownToolbarAction(
      { value, selectionStart, selectionEnd },
      "bold"
    );

    expect(result.value).toBe("hello **test** world");
    expect(result.selectionStart).toBe(selectionStart + 2); // "**"
    expect(result.selectionEnd).toBe(result.selectionStart + "test".length);
  });

  it("inserts link syntax for selected text", () => {
    const value = "see this";
    const selectionStart = value.indexOf("this");
    const selectionEnd = selectionStart + "this".length;

    const result = applyMarkdownToolbarAction(
      { value, selectionStart, selectionEnd },
      "link"
    );

    expect(result.value).toBe("see [this](https://example.com)");
    expect(result.selectionStart).toBe(selectionStart + 1); // "["
    expect(result.selectionEnd).toBe(result.selectionStart + "this".length);
  });

  it("prefixes selected lines for a bulleted list", () => {
    const value = "a\nb";
    const selectionStart = 0;
    const selectionEnd = value.length;

    const result = applyMarkdownToolbarAction(
      { value, selectionStart, selectionEnd },
      "bulletList"
    );

    expect(result.value).toBe("- a\n- b");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(("- a\n- b").length);
  });

  it("insertAtCursor replaces the selection with inserted text", () => {
    const result = insertAtCursor("hello world", 5, 11, " there");

    expect(result.value).toBe("hello there");
    expect(result.selectionStart).toBe(11);
    expect(result.selectionEnd).toBe(11);
  });

  it("applies italic formatting", () => {
    const value = "make italic";
    const start = value.indexOf("italic");
    const end = start + "italic".length;

    const result = applyMarkdownToolbarAction({ value, selectionStart: start, selectionEnd: end }, "italic");

    expect(result.value).toBe("make *italic*");
  });

  it("prefixes heading levels for selected lines", () => {
    const value = "Title\nSubtitle";
    const resultH2 = applyMarkdownToolbarAction(
      { value, selectionStart: 0, selectionEnd: value.length },
      "heading2"
    );
    const resultH3 = applyMarkdownToolbarAction(
      { value, selectionStart: 0, selectionEnd: value.length },
      "heading3"
    );

    expect(resultH2.value).toBe("## Title\n## Subtitle");
    expect(resultH3.value).toBe("### Title\n### Subtitle");
  });

  it("prefixes blockquote syntax", () => {
    const value = "Quoted line";
    const result = applyMarkdownToolbarAction(
      { value, selectionStart: 0, selectionEnd: value.length },
      "quote"
    );

    expect(result.value).toBe("> Quoted line");
  });

  it("prefixes numbered list markers", () => {
    const value = "first\nsecond";
    const result = applyMarkdownToolbarAction(
      { value, selectionStart: 0, selectionEnd: value.length },
      "numberList"
    );

    expect(result.value).toBe("1. first\n2. second");
  });

  it("handles empty lines in list prefixes", () => {
    const value = "item\n\nnext";
    const result = applyMarkdownToolbarAction(
      { value, selectionStart: 0, selectionEnd: value.length },
      "bulletList"
    );

    expect(result.value).toBe("- item\n-\n- next");
  });

  it("wraps inline code and fenced code blocks", () => {
    const inline = applyMarkdownToolbarAction(
      { value: "run fn()", selectionStart: 4, selectionEnd: 6 },
      "inlineCode"
    );
    const block = applyMarkdownToolbarAction(
      { value: "", selectionStart: 0, selectionEnd: 0 },
      "codeBlock"
    );

    expect(inline.value).toBe("run `fn`()");
    expect(block.value).toBe("```ts\ncode\n```");
  });

  it("uses placeholders when selections are empty", () => {
    const heading = applyMarkdownToolbarAction(
      { value: "prefix", selectionStart: 6, selectionEnd: 6 },
      "heading2"
    );
    const quote = applyMarkdownToolbarAction(
      { value: "", selectionStart: 0, selectionEnd: 0 },
      "quote"
    );

    expect(heading.value).toBe("prefix## Heading");
    expect(quote.value).toBe("> Quote");
  });

  it("returns the original selection for unknown actions", () => {
    const selection = { value: "unchanged", selectionStart: 2, selectionEnd: 5 };
    const result = applyMarkdownToolbarAction(
      selection,
      "unknown" as MarkdownToolbarAction
    );

    expect(result).toEqual(selection);
  });
});

