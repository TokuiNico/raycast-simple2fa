import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => void store.set(key, value),
  },
}));

import { addAccount, listAccounts, removeAccount } from "../accounts";

function fakeKeychain() {
  const secrets = new Map<string, string>();
  return {
    secrets,
    set: async (id: string, secret: string) => void secrets.set(id, secret),
    get: async (id: string) => secrets.get(id),
    remove: async (id: string) => void secrets.delete(id),
  };
}

const GITHUB = {
  issuer: "GitHub",
  name: "alice",
  secret: "JBSWY3DPEHPK3PXP",
  algorithm: "SHA1" as const,
  digits: 6,
  period: 30,
};

beforeEach(() => store.clear());

describe("accounts", () => {
  it("starts empty", async () => {
    expect(await listAccounts()).toEqual([]);
  });

  it("keeps the secret in the Keychain and the rest in LocalStorage", async () => {
    const keychain = fakeKeychain();
    await addAccount(GITHUB, keychain);

    expect(keychain.secrets.get("GitHub:alice")).toBe("JBSWY3DPEHPK3PXP");
    expect(await listAccounts()).toEqual([
      { id: "GitHub:alice", issuer: "GitHub", name: "alice", algorithm: "SHA1", digits: 6, period: 30 },
    ]);
    expect(store.get("accounts")).not.toContain("JBSWY3DPEHPK3PXP");
  });

  it("names an account with no issuer by its name alone", async () => {
    await addAccount({ ...GITHUB, issuer: "" }, fakeKeychain());
    expect((await listAccounts())[0].id).toBe("alice");
  });

  it("refuses a duplicate id", async () => {
    const keychain = fakeKeychain();
    await addAccount(GITHUB, keychain);
    await expect(addAccount(GITHUB, keychain)).rejects.toThrow(/already/);
  });

  it("removes both halves", async () => {
    const keychain = fakeKeychain();
    await addAccount(GITHUB, keychain);
    await removeAccount("GitHub:alice", keychain);

    expect(await listAccounts()).toEqual([]);
    expect(keychain.secrets.size).toBe(0);
  });

  it("ignores a corrupt LocalStorage payload rather than failing to open", async () => {
    store.set("accounts", "{not json");
    expect(await listAccounts()).toEqual([]);
  });
});
