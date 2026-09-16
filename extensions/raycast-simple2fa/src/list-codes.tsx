import { Action, ActionPanel, Alert, Color, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoredAccount, listAccounts, readSecret, removeAccount } from "./accounts";
import { generateTotp, secondsRemaining } from "./totp";
import AddAccount from "./add-account";

type Entry = StoredAccount & { secret: string };

export default function Command() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  async function load() {
    setLoading(true);
    try {
      const accounts = await listAccounts();
      const loaded: Entry[] = [];
      for (const account of accounts) {
        const secret = await readSecret(account.id);
        if (secret) {
          loaded.push({ ...account, secret });
        }
      }
      setEntries(loaded);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read the Keychain",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function confirmRemove(entry: Entry) {
    const confirmed = await confirmAlert({
      title: `Remove ${entry.id}?`,
      message: "The secret is deleted from the Keychain. This cannot be undone.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await removeAccount(entry.id);
    await showToast({ style: Toast.Style.Success, title: `Removed ${entry.id}` });
    await load();
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search accounts">
      <List.EmptyView
        icon={Icon.Key}
        title="No accounts yet"
        description="Add one with an otpauth:// URI or a setup key."
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Account" target={<AddAccount onAdded={load} />} />
          </ActionPanel>
        }
      />
      {entries.map((entry) => {
        const code = generateTotp(entry, now);
        const remaining = secondsRemaining(entry.period, now);
        return (
          <List.Item
            key={entry.id}
            icon={Icon.Key}
            title={entry.issuer || entry.name}
            subtitle={entry.issuer ? entry.name : undefined}
            accessories={[
              { tag: { value: formatCode(code), color: remaining <= 5 ? Color.Red : Color.PrimaryText } },
              { text: `${remaining}s`, icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Code" content={code} concealed />
                <Action.Paste title="Paste Code" content={code} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Account"
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<AddAccount onAdded={load} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Remove Account"
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => confirmRemove(entry)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}
