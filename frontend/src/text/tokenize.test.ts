import { cleanWord, tokenize } from "./tokenize";

describe("tokenize", () => {
  it("splits into word and non-word spans that rejoin to the original", () => {
    const text = "Hello, world! It's nice.";
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.text).join("")).toBe(text);
    expect(tokens.filter((t) => t.isWord).map((t) => t.text)).toEqual([
      "Hello",
      "world",
      "It's",
      "nice",
    ]);
    expect(tokens[1]).toEqual({ text: ", ", isWord: false });
  });

  it("strips surrounding punctuation", () => {
    expect(cleanWord('"world!"')).toBe("world");
    expect(cleanWord("don't.")).toBe("don't");
  });
});
