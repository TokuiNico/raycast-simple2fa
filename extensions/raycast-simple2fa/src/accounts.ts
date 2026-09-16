import { LocalStorage } from "@raycast/api";
import { Account } from "./otpauth";
import { createKeychain } from "./keychain";
import { TotpAlgorithm } from "./totp";

const STORAGE_KEY = "accounts";

export type StoredAccount = {
  id: string;
  issuer: string;
  name: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
};

type Keychain = ReturnType<typeof createKeychain>;

export function accountId(issuer: string, name: string): string {
  return issuer ? `${issuer}:${name}` : name;
}

export async function listAccounts(): Promise<StoredAccount[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(accounts: StoredAccount[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export async function addAccount(account: Account, keychain: Keychain = createKeychain()): Promise<StoredAccount> {
  const id = accountId(account.issuer, account.name);
  const accounts = await listAccounts();
  if (accounts.some((stored) => stored.id === id)) {
    throw new Error(`${id} is already stored`);
  }

  await keychain.set(id, account.secret);
  const stored: StoredAccount = {
    id,
    issuer: account.issuer,
    name: account.name,
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
  };
  await save([...accounts, stored]);
  return stored;
}

export async function removeAccount(id: string, keychain: Keychain = createKeychain()): Promise<void> {
  await keychain.remove(id);
  await save((await listAccounts()).filter((stored) => stored.id !== id));
}

export async function readSecret(id: string, keychain: Keychain = createKeychain()): Promise<string | undefined> {
  return keychain.get(id);
}
