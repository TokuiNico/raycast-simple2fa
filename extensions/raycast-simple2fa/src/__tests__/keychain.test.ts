import { describe, expect, it } from "vitest";
import { KEYCHAIN_SERVICE, createKeychain, SecurityError } from "../keychain";

function fakeRunner(reply: { stdout?: string; error?: SecurityError } = {}) {
  const calls: string[][] = [];
  const run = async (args: string[]) => {
    calls.push(args);
    if (reply.error) {
      throw reply.error;
    }
    return reply.stdout ?? "";
  };
  return { calls, run };
}

describe("createKeychain", () => {
  it("writes a secret, replacing any earlier entry for the same id", async () => {
    const runner = fakeRunner();
    await createKeychain(runner.run).set("github:alice", "JBSWY3DPEHPK3PXP");
    expect(runner.calls).toEqual([
      ["add-generic-password", "-U", "-s", KEYCHAIN_SERVICE, "-a", "github:alice", "-w", "JBSWY3DPEHPK3PXP"],
    ]);
  });

  it("reads a secret and drops the trailing newline", async () => {
    const runner = fakeRunner({ stdout: "JBSWY3DPEHPK3PXP\n" });
    const secret = await createKeychain(runner.run).get("github:alice");
    expect(secret).toBe("JBSWY3DPEHPK3PXP");
    expect(runner.calls[0]).toEqual(["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", "github:alice", "-w"]);
  });

  it("returns undefined when the item is absent", async () => {
    const error: SecurityError = Object.assign(new Error("not found"), { code: 44 });
    const secret = await createKeychain(fakeRunner({ error }).run).get("missing");
    expect(secret).toBeUndefined();
  });

  it("passes any other failure through", async () => {
    const error: SecurityError = Object.assign(new Error("User canceled"), { code: 128 });
    await expect(createKeychain(fakeRunner({ error }).run).get("github:alice")).rejects.toThrow("User canceled");
  });

  it("deletes an item", async () => {
    const runner = fakeRunner();
    await createKeychain(runner.run).remove("github:alice");
    expect(runner.calls[0]).toEqual(["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", "github:alice"]);
  });

  it("treats deleting an absent item as done", async () => {
    const error: SecurityError = Object.assign(new Error("not found"), { code: 44 });
    await expect(createKeychain(fakeRunner({ error }).run).remove("missing")).resolves.toBeUndefined();
  });
});
