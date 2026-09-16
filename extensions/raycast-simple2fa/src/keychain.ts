import { execFile } from "child_process";

export const KEYCHAIN_SERVICE = "com.tinycast.simple2fa";

const SECURITY = "/usr/bin/security";
const ERR_ITEM_NOT_FOUND = 44;

export type SecurityError = Error & { code?: number };

export type SecurityRunner = (args: string[]) => Promise<string>;

// `security -w <secret>` puts the secret in the process argument list, where any
// other process on the machine can read it. The CLI has no way to take it on
// stdin, and Raycast extensions have no Keychain API, so this is the trade.
export const runSecurity: SecurityRunner = (args) =>
  new Promise((resolve, reject) => {
    execFile(SECURITY, args, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });

export function createKeychain(run: SecurityRunner = runSecurity) {
  return {
    async set(id: string, secret: string): Promise<void> {
      await run(["add-generic-password", "-U", "-s", KEYCHAIN_SERVICE, "-a", id, "-w", secret]);
    },

    async get(id: string): Promise<string | undefined> {
      try {
        const stdout = await run(["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", id, "-w"]);
        return stdout.replace(/\n$/, "");
      } catch (error) {
        if ((error as SecurityError).code === ERR_ITEM_NOT_FOUND) {
          return undefined;
        }
        throw error;
      }
    },

    async remove(id: string): Promise<void> {
      try {
        await run(["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", id]);
      } catch (error) {
        if ((error as SecurityError).code === ERR_ITEM_NOT_FOUND) {
          return;
        }
        throw error;
      }
    },
  };
}
