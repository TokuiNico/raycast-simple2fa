# Security

## Reporting a vulnerability

Open a [private security advisory](https://github.com/TokuiNico/raycast-simple2fa/security/advisories/new).
Do not open a public issue for a vulnerability.

## What this extension protects, and what it does not

TOTP secrets are stored in the macOS login Keychain, under the service
`com.tinycast.simple2fa`. The account name of each item is `issuer:name`.

Everything else — issuer, account name, algorithm, digit count, period — is stored
through the host's `LocalStorage`. In Tinycast that is a plain JSON file under
`~/Library/Application Support/<bundle id>/extension-data/`. Nothing secret goes there.

### Known weakness: the secret appears in the argument list on write

Raycast's extension API has no Keychain interface, and Tinycast reserves its own
Keychain use for OAuth tokens. This extension therefore calls `/usr/bin/security`.

Adding an account runs:

```
security add-generic-password -U -s com.tinycast.simple2fa -a <id> -w <secret>
```

For the duration of that one call, the secret is visible in the process argument
list to any other process running as the same user. The `security` CLI has no way
to read a password from stdin, so this cannot be avoided while the CLI is the only
route to the Keychain.

Reading and deleting do not carry the secret in arguments and are not affected.

### Uninstalling does not remove the secrets

The host clears its own storage when an extension is uninstalled. It does not know
about the Keychain items this extension created, so they stay in the login Keychain.

To remove them by hand, run this until it reports that no item was found:

```
security delete-generic-password -s com.tinycast.simple2fa
```

### Out of scope

- An attacker who already runs code as your user. They can read the Keychain with
  your authorization, or watch the argument list above.
- A compromised host application. The extension runs inside Tinycast or Raycast and
  trusts them.
- Physical access to an unlocked machine.

## Threat model in one line

This extension protects your TOTP secrets from being read out of a plain file on
disk. It does not protect them from code already running as you.
