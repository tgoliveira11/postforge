import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectPostEditorFormData,
  dispatchAutosavePause,
  dispatchAutosaveResume,
  notifyPostEditorDirty,
  shouldRunAutosave,
} from "@/modules/posts/post-editor-payload";

describe("post editor payload DOM helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when document is unavailable", () => {
    vi.stubGlobal("document", undefined);
    expect(collectPostEditorFormData()).toBeNull();
    expect(notifyPostEditorDirty()).toBeUndefined();
    expect(dispatchAutosavePause()).toBeUndefined();
    expect(dispatchAutosaveResume()).toBeUndefined();
  });

  it("returns null when the form element is missing or not a form", () => {
    class HTMLFormElement {}

    vi.stubGlobal("HTMLFormElement", HTMLFormElement);
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => ({ tagName: "DIV" })),
      dispatchEvent: vi.fn(),
    });

    expect(collectPostEditorFormData("missing-form")).toBeNull();
  });

  it("collects form data and dispatches editor events", () => {
    class HTMLFormElement {}

    const form = Object.create(HTMLFormElement.prototype);
    form.dispatchEvent = vi.fn();
    const formData = new FormData();
    formData.set("title", "Hello");

    vi.stubGlobal("HTMLFormElement", HTMLFormElement);
    vi.stubGlobal("FormData", class extends FormData {
      constructor(form?: unknown) {
        super();
        if (form === form) {
          return formData;
        }
      }
    });
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => form),
      dispatchEvent: vi.fn(),
    });

    Object.setPrototypeOf(form, HTMLFormElement.prototype);

    const collected = collectPostEditorFormData("post-editor-form");
    expect(collected).toBe(formData);
    notifyPostEditorDirty("post-editor-form");
    expect(form.dispatchEvent).toHaveBeenCalled();
    dispatchAutosavePause();
    dispatchAutosaveResume();
    expect(document.dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it("shouldRunAutosave returns false when paused", () => {
    expect(
      shouldRunAutosave({
        userEdited: true,
        paused: true,
        payload: "x",
        lastSavedPayload: null,
      })
    ).toBe(false);
  });
});
