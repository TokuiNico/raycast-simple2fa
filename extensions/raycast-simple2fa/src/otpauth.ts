import { base32Decode, DEFAULT_ALGORITHM, DEFAULT_DIGITS, DEFAULT_PERIOD, TotpAlgorithm } from "./totp";

export type Account = {
  issuer: string;
  name: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
};

const ALGORITHMS: TotpAlgorithm[] = ["SHA1", "SHA256", "SHA512"];

export function normalizeSecret(raw: string): string {
  const secret = raw.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (secret.length === 0) {
    throw new Error("The secret is empty");
  }
  base32Decode(secret); // throws on anything outside the base32 alphabet
  return secret;
}

export function parseOtpauthUri(uri: string): Account {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw new Error("Not an otpauth:// URI");
  }
  if (url.protocol !== "otpauth:") {
    throw new Error("Not an otpauth:// URI");
  }
  if (url.host.toLowerCase() !== "totp") {
    throw new Error("Only totp URIs are supported, not hotp");
  }

  const label = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const separator = label.indexOf(":");
  const labelIssuer = separator < 0 ? "" : label.slice(0, separator).trim();
  const name = separator < 0 ? label : label.slice(separator + 1).trim();

  const rawSecret = url.searchParams.get("secret");
  if (!rawSecret) {
    throw new Error("The URI carries no secret");
  }
  let secret: string;
  try {
    secret = normalizeSecret(rawSecret);
  } catch {
    throw new Error("The secret is not valid base32");
  }

  const algorithm = (url.searchParams.get("algorithm") ?? DEFAULT_ALGORITHM).toUpperCase() as TotpAlgorithm;
  if (!ALGORITHMS.includes(algorithm)) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  return {
    issuer: url.searchParams.get("issuer")?.trim() || labelIssuer,
    name,
    secret,
    algorithm,
    digits: Number(url.searchParams.get("digits") ?? DEFAULT_DIGITS),
    period: Number(url.searchParams.get("period") ?? DEFAULT_PERIOD),
  };
}
