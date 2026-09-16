import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addAccount } from "./accounts";
import { Account, normalizeSecret, parseOtpauthUri } from "./otpauth";
import { DEFAULT_ALGORITHM, DEFAULT_DIGITS, DEFAULT_PERIOD, TotpAlgorithm } from "./totp";

type Values = {
  secret: string;
  issuer: string;
  name: string;
  algorithm: string;
  digits: string;
  period: string;
};

export default function AddAccount({ onAdded }: { onAdded?: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  async function submit(values: Values) {
    let account: Account;
    try {
      account = toAccount(values);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
      return;
    }

    try {
      await addAccount(account);
    } catch (problem) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save the account",
        message: problem instanceof Error ? problem.message : String(problem),
      });
      return;
    }

    await showToast({ style: Toast.Style.Success, title: `Added ${account.issuer || account.name}` });
    onAdded?.();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Account" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="secret"
        title="Secret"
        placeholder="Setup key, or a whole otpauth:// URI"
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description text="An otpauth:// URI carries its own issuer, name and settings, so the fields below are ignored." />
      <Form.TextField id="issuer" title="Issuer" placeholder="GitHub" />
      <Form.TextField id="name" title="Account" placeholder="alice@example.com" />
      <Form.Separator />
      <Form.Dropdown id="algorithm" title="Algorithm" defaultValue={DEFAULT_ALGORITHM}>
        <Form.Dropdown.Item value="SHA1" title="SHA1" />
        <Form.Dropdown.Item value="SHA256" title="SHA256" />
        <Form.Dropdown.Item value="SHA512" title="SHA512" />
      </Form.Dropdown>
      <Form.Dropdown id="digits" title="Digits" defaultValue={String(DEFAULT_DIGITS)}>
        <Form.Dropdown.Item value="6" title="6" />
        <Form.Dropdown.Item value="8" title="8" />
      </Form.Dropdown>
      <Form.Dropdown id="period" title="Period" defaultValue={String(DEFAULT_PERIOD)}>
        <Form.Dropdown.Item value="30" title="30 seconds" />
        <Form.Dropdown.Item value="60" title="60 seconds" />
      </Form.Dropdown>
    </Form>
  );
}

function toAccount(values: Values): Account {
  const input = values.secret.trim();
  if (input.length === 0) {
    throw new Error("Enter a setup key or an otpauth:// URI");
  }
  if (input.toLowerCase().startsWith("otpauth://")) {
    return parseOtpauthUri(input);
  }

  const name = values.name.trim();
  const issuer = values.issuer.trim();
  if (name.length === 0 && issuer.length === 0) {
    throw new Error("Enter an issuer or an account name");
  }

  return {
    issuer,
    name: name || issuer,
    secret: normalizeSecret(input),
    algorithm: values.algorithm as TotpAlgorithm,
    digits: Number(values.digits),
    period: Number(values.period),
  };
}
