import { describe, expect, it } from "vitest";
import { addLine, cartCount, cartTotal, emptyCart, setQuantity } from "./cart";

const latte = {
  itemId: "i1",
  name: "Latte",
  choices: ["c2", "c3"],
  choiceNames: ["Grand", "Crème"],
  unitPrice: 6,
  quantity: 1,
  note: "",
};

describe("cart", () => {
  it("merges the same item with the same choices", () => {
    let c = addLine(emptyCart, latte);
    c = addLine(c, { ...latte, choices: ["c3", "c2"], quantity: 2 });
    expect(c.lines).toHaveLength(1);
    expect(cartCount(c)).toBe(3);
    c = addLine(c, { ...latte, choices: ["c1"], unitPrice: 4 });
    expect(c.lines).toHaveLength(2);
    expect(cartTotal(c)).toBe(22);
  });
  it("caps quantities and removes at 0", () => {
    let c = addLine(emptyCart, { ...latte, quantity: 50 });
    expect(c.lines[0].quantity).toBe(20);
    c = setQuantity(c, c.lines[0].key, 99);
    expect(c.lines[0].quantity).toBe(20);
    c = setQuantity(c, c.lines[0].key, 0);
    expect(c.lines).toHaveLength(0);
  });
});
