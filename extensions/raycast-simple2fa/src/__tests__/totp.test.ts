import { describe, expect, it } from "vitest";
import { base32Decode, generateTotp, secondsRemaining } from "../totp";

// RFC 6238 Appendix B uses the ASCII seed "12345678901234567890".
const SEED_SHA1 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const SEED_SHA256 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA";
const SEED_SHA512 =
  "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA";

describe("base32Decode", () => {
  it("decodes RFC 4648 vectors", () => {
    expect(base32Decode("MZXW6===").toString()).toBe("foo");
    expect(base32Decode("MZXW6YTBOI======").toString()).toBe("foobar");
  });

  it("ignores padding, spaces and case", () => {
    expect(base32Decode("mzxw 6ytb oi").toString()).toBe("foobar");
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => base32Decode("MZXW6YTB01")).toThrow();
  });
});

describe("generateTotp", () => {
  const cases: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];

  it.each(cases)("matches RFC 6238 SHA1 at t=%i", (seconds, expected) => {
    expect(generateTotp({ secret: SEED_SHA1, digits: 8, period: 30, algorithm: "SHA1" }, seconds * 1000)).toBe(
      expected,
    );
  });

  it("matches RFC 6238 SHA256 at t=59", () => {
    expect(generateTotp({ secret: SEED_SHA256, digits: 8, period: 30, algorithm: "SHA256" }, 59000)).toBe("46119246");
  });

  it("matches RFC 6238 SHA512 at t=59", () => {
    expect(generateTotp({ secret: SEED_SHA512, digits: 8, period: 30, algorithm: "SHA512" }, 59000)).toBe("90693936");
  });

  it("defaults to 6 digits, 30 seconds, SHA1", () => {
    expect(generateTotp({ secret: SEED_SHA1 }, 59000)).toBe("287082");
  });

  it("pads short codes with leading zeros", () => {
    expect(generateTotp({ secret: SEED_SHA1, digits: 8 }, 1111111109000)).toHaveLength(8);
    expect(generateTotp({ secret: SEED_SHA1, digits: 8 }, 1111111109 * 1000)).toBe("07081804");
  });
});

describe("secondsRemaining", () => {
  it("counts down within the period", () => {
    expect(secondsRemaining(30, 0)).toBe(30);
    expect(secondsRemaining(30, 1000)).toBe(29);
    expect(secondsRemaining(30, 29000)).toBe(1);
    expect(secondsRemaining(30, 30000)).toBe(30);
  });

  it("honours a non-default period", () => {
    expect(secondsRemaining(60, 45000)).toBe(15);
  });
});

describe("Tinycast's Buffer polyfill", () => {
  // Tinycast's `buffer` shim has no writeUInt32BE. Node's does, so the test
  // takes it away to reproduce what the extension hits at runtime.
  function withoutWriteUInt32BE<T>(body: () => T): T {
    const original = Buffer.prototype.writeUInt32BE;
    delete Buffer.prototype.writeUInt32BE;
    try {
      return body();
    } finally {
      Buffer.prototype.writeUInt32BE = original;
    }
  }

  it("generates a code without it", () => {
    withoutWriteUInt32BE(() => {
      expect(generateTotp({ secret: SEED_SHA1, digits: 8 }, 59000)).toBe("94287082");
    });
  });

  it("still handles a counter past 2^32", () => {
    withoutWriteUInt32BE(() => {
      expect(generateTotp({ secret: SEED_SHA1, digits: 8 }, 20000000000 * 1000)).toBe("65353130");
    });
  });
});
