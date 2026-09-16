# Simple 2FA

[繁體中文](README.zh-TW.md)

A [Tinycast](https://github.com/abue-ammar/tinycast) / [Raycast](https://raycast.com)
extension that shows your TOTP codes with a live countdown. Press Enter to copy one
to the clipboard. The secrets live in the macOS Keychain.

**macOS only.** The extension stores secrets by calling `/usr/bin/security`, which
exists only on macOS. There is no Windows or Linux path.

## Commands

- **2FA Codes** — every account, its current code, and the seconds left on it.
  - `Enter` copies the code
  - `⌘N` adds an account
  - `⌃X` removes an account, and its Keychain item with it
- **Add 2FA Account** — paste an `otpauth://` URI, or type a setup key by hand.

## Install

### Tinycast, from this repository

Add `https://github.com/TokuiNico/raycast-simple2fa` as a registry in
Settings → Extensions, then search for **Simple 2FA**. Tinycast fetches the
`extensions/raycast-simple2fa/` folder, installs its dependencies and builds it.
This needs Node and a package manager on your machine.

### Tinycast, from a local build

```
cd extensions/raycast-simple2fa
npm install
npm run build
```

Then Settings → Extensions → Install New → **Add Folder…** and pick the `build/`
directory that was just written.

### Raycast

```
cd extensions/raycast-simple2fa
npm install
npm run dev
```

`ray develop` installs it into your local Raycast with hot reload.

## Why the Keychain

A TOTP secret is a long-lived credential. Anyone who reads it can generate your
codes forever, so it should not sit in a file that any process can open.

The host applications do not offer somewhere safe to put it:

- Raycast's extension API has no Keychain interface at all.
- Tinycast does use the Keychain, but only for OAuth tokens it manages itself.
  Extension `LocalStorage` in Tinycast is a plain JSON file under
  `~/Library/Application Support/<bundle id>/extension-data/`.

So the extension goes to the Keychain directly, through the `security` CLI. That has
one cost, described in [SECURITY.md](SECURITY.md): writing a secret puts it in the
process argument list for the length of that one call.

## Why this is not on the Raycast Store

Raycast's store rules say:

> Extensions requesting Keychain Access will be rejected due to security concerns.

— [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)

The Keychain is the whole point of this extension, so it cannot be published there.
Raycast's own `LocalStorage` is an encrypted database, so a store-ready version would
keep secrets there instead — a different design, not the same code with a flag.

Install it from this repository instead, by either route above.

## Where data is stored

| What | Where |
| --- | --- |
| Secret | macOS Keychain, service `com.tinycast.simple2fa`, account `issuer:name` |
| Issuer, account name, algorithm, digits, period | The host's `LocalStorage` |

Uninstalling the extension does not remove the Keychain items. See
[SECURITY.md](SECURITY.md) for how to clear them.

## Development

```
cd extensions/raycast-simple2fa
npm install
npm test          # vitest
npm run build     # ray build -e dist -o build
```

TOTP is checked against the RFC 6238 test vectors for SHA1, SHA256 and SHA512. The
Keychain layer takes its `security` runner as an argument, so the tests assert on the
arguments it builds and never touch a real Keychain.

One test removes `Buffer.prototype.writeUInt32BE` before running. Tinycast's `buffer`
shim does not ship that method, and Node's does, so without the test a change could
pass locally and fail inside Tinycast.

## License

[MIT](LICENSE)
