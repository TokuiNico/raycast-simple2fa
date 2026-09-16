import { describe, expect, it } from "vitest";
import { parseOtpauthUri } from "../otpauth";

describe("parseOtpauthUri", () => {
  it("reads a full URI", () => {
    const account = parseOtpauthUri(
      "otpauth://totp/GitHub:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA256&digits=8&period=60",
    );
    expect(account).toEqual({
      issuer: "GitHub",
      name: "alice@example.com",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA256",
      digits: 8,
      period: 60,
    });
  });

  it("falls back to the defaults RFC 6238 uses", () => {
    expect(parseOtpauthUri("otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP")).toEqual({
      issuer: "",
      name: "alice",
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
  });

  it("decodes percent-escapes in the label", () => {
    const account = parseOtpauthUri("otpauth://totp/Big%20Corp:a%40b.com?secret=JBSWY3DPEHPK3PXP");
    expect(account.issuer).toBe("Big Corp");
    expect(account.name).toBe("a@b.com");
  });

  it("prefers the issuer parameter over the label prefix", () => {
    const account = parseOtpauthUri("otpauth://totp/Old:alice?secret=JBSWY3DPEHPK3PXP&issuer=New");
    expect(account.issuer).toBe("New");
  });

  it("strips spaces and lowercase from the secret", () => {
    expect(parseOtpauthUri("otpauth://totp/a?secret=jbsw%20y3dp%20ehpk3pxp").secret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rejects a non-otpauth URI", () => {
    expect(() => parseOtpauthUri("https://example.com")).toThrow(/otpauth/);
  });

  it("rejects hotp, which has a counter rather than a clock", () => {
    expect(() => parseOtpauthUri("otpauth://hotp/a?secret=JBSWY3DPEHPK3PXP&counter=1")).toThrow(/totp/);
  });

  it("rejects a missing or invalid secret", () => {
    expect(() => parseOtpauthUri("otpauth://totp/a")).toThrow(/secret/);
    expect(() => parseOtpauthUri("otpauth://totp/a?secret=0189")).toThrow(/secret/);
  });

  it("rejects an unsupported algorithm", () => {
    expect(() => parseOtpauthUri("otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=MD5")).toThrow(/algorithm/);
  });
});
