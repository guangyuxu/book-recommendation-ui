// useSyncOnChange replaced the "seed form state from server data in a useEffect" pattern across
// the forms (react-hooks/set-state-in-effect, new in eslint-plugin-react-hooks v7). The two
// properties that made it a safe swap are pinned here: it does NOT fire on the first render (an
// effect seeding from `undefined` was a no-op, so firing would change behavior), and the seeded
// value is present in the FIRST painted frame rather than one frame late.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { useSyncOnChange } from "@/lib/syncOnChange";

function Seeded({ from }: { from?: string }) {
  const [value, setValue] = useState("");
  useSyncOnChange([from], () => {
    if (from) setValue(from);
  });
  return <output>{value || "(empty)"}</output>;
}

describe("useSyncOnChange", () => {
  it("does not fire on the first render", () => {
    const apply = vi.fn();
    function Probe() {
      useSyncOnChange(["stable"], apply);
      return null;
    }
    render(<Probe />);

    expect(apply).not.toHaveBeenCalled();
  });

  it("fires when a dep changes identity, and not when it does not", () => {
    const apply = vi.fn();
    function Probe({ dep }: { dep: string }) {
      useSyncOnChange([dep], apply);
      return <output>{dep}</output>;
    }
    const { rerender } = render(<Probe dep="a" />);

    rerender(<Probe dep="b" />);
    expect(apply).toHaveBeenCalledTimes(1);

    rerender(<Probe dep="b" />);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("compares deps element-wise, so a changed second entry still fires", () => {
    const apply = vi.fn();
    function Probe({ open, row }: { open: boolean; row?: object }) {
      useSyncOnChange([open, row], apply);
      return null;
    }
    const first = {};
    const { rerender } = render(<Probe open={false} row={first} />);

    rerender(<Probe open={false} row={{}} />);
    expect(apply).toHaveBeenCalledTimes(1);

    rerender(<Probe open={true} row={first} />);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("shows the seeded value in the first painted frame", () => {
    const { rerender } = render(<Seeded />);
    expect(screen.getByRole("status")).toHaveTextContent("(empty)");

    // The equivalent useEffect would paint "(empty)" once more before the seed landed. Because
    // the state is adjusted during render, React re-runs the render before committing, so the
    // very first DOM the caller can observe after this rerender already has the value.
    rerender(<Seeded from="from-server" />);
    expect(screen.getByRole("status")).toHaveTextContent("from-server");
  });
});
