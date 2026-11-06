import test from "node:test";
import assert from "node:assert/strict";
import input from "../shared/ticket-input.cjs";
const { extractNormalizedCode } = input;
test("FR09 shared normalizer accepts aliases, arbitrary codes, JSON, URLs, prefixes and QR hash fragments", () => {
  for (const raw of [
    "v1",
    " 8f9a ",
    "NOVA-20261102-8f9a",
    "QR_INVALID_999",
    '{"ticketCode":"v1"}',
    "https://nova.test/ticket/V1?x=1",
    "TICKET:v1",
  ])
    assert.equal(
      extractNormalizedCode(raw),
      raw.includes("8f9a")
        ? raw.includes("NOVA")
          ? "NOVA-20261102-8F9A"
          : "8F9A"
        : raw === "QR_INVALID_999"
          ? raw
          : "V1",
    );
  assert.equal(
    extractNormalizedCode(`https://nova.test/ve#${"ab".repeat(32)}`),
    "AB".repeat(32),
  );
  assert.equal(extractNormalizedCode(null), "");
  assert.equal(extractNormalizedCode("   "), "");
  assert.equal(extractNormalizedCode("javascript:V1"), "JAVASCRIPT:V1");
  assert.equal(
    extractNormalizedCode("<script>V1</script>"),
    "<SCRIPT>V1</SCRIPT>",
  );
});
