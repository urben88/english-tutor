import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { useMute } from "./useMute";

describe("useMute", () => {
  it("toggles with the toggle function", () => {
    const { result } = renderHook(() => useMute());
    expect(result.current.muted).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.muted).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.muted).toBe(false);
  });

  it("toggles with the M key", () => {
    const { result } = renderHook(() => useMute());
    act(() => {
      fireEvent.keyDown(window, { code: "KeyM", key: "m" });
    });
    expect(result.current.muted).toBe(true);
  });

  it("ignores M while typing in a text input", () => {
    const { result } = renderHook(() => useMute());
    const { getByRole } = render(<input aria-label="x" />);
    act(() => {
      fireEvent.keyDown(getByRole("textbox"), { code: "KeyM", key: "m" });
    });
    expect(result.current.muted).toBe(false);
  });
});
