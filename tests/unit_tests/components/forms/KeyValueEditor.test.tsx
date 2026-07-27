// One real component test, deliberately over the simplest controlled component in the tree: it
// proves the whole rendering harness works end to end (jsdom + Testing Library + the `@` alias +
// Tailwind-classed shadcn primitives) so the next component test is a one-liner to add.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KeyValueEditor } from "@/components/forms/KeyValueEditor";
import type { KVRow } from "@/components/forms/keyValue";

const rows: KVRow[] = [
  { key: "theme", value: "space" },
  { key: "max_pages", value: "120" },
];

describe("KeyValueEditor", () => {
  it("renders one key/value input pair per row", () => {
    render(<KeyValueEditor rows={rows} onChange={vi.fn()} />);

    expect(screen.getAllByPlaceholderText("key")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("value")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("key")[0]).toHaveValue("theme");
    expect(screen.getAllByPlaceholderText("value")[1]).toHaveValue("120");
  });

  it("reports an edited row without touching its siblings", () => {
    // Fully controlled: it never mutates, it hands back a whole new array.
    const onChange = vi.fn();
    render(<KeyValueEditor rows={rows} onChange={onChange} />);

    fireEvent.change(screen.getAllByPlaceholderText("value")[0], {
      target: { value: "pirates" },
    });

    expect(onChange).toHaveBeenCalledWith([
      { key: "theme", value: "pirates" },
      { key: "max_pages", value: "120" },
    ]);
    expect(rows[0].value).toBe("space"); // original untouched
  });

  it("appends a blank row on Add", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor rows={rows} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /add preference/i }));

    expect(onChange).toHaveBeenCalledWith([...rows, { key: "", value: "" }]);
  });

  it("removes the row whose button was clicked", () => {
    const onChange = vi.fn();
    render(<KeyValueEditor rows={rows} onChange={onChange} />);

    // The remove buttons are icon-only, so they carry an aria-label -- which is also what makes
    // them reachable by a screen reader.
    fireEvent.click(screen.getAllByRole("button", { name: "Remove entry" })[0]);

    expect(onChange).toHaveBeenCalledWith([{ key: "max_pages", value: "120" }]);
  });

  it("renders nothing but the Add button when empty", () => {
    render(<KeyValueEditor rows={[]} onChange={vi.fn()} />);

    expect(screen.queryByPlaceholderText("key")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add preference/i }),
    ).toBeInTheDocument();
  });
});
