# Simple 2FA

[English](README.md)

[Tinycast](https://github.com/abue-ammar/tinycast) / [Raycast](https://raycast.com)
extension。顯示 TOTP 驗證碼與倒數，按 Enter 複製到剪貼簿。Secret 存在 macOS Keychain。

**只能在 macOS 用。** 存 secret 靠呼叫 `/usr/bin/security`，那是 macOS 才有的工具。
沒有 Windows 或 Linux 的做法。

## 指令

- **2FA Codes** — 列出所有帳號、目前的驗證碼、這組碼還剩幾秒。
  - `Enter` 複製驗證碼
  - `⌘N` 新增帳號
  - `⌃X` 刪除帳號，Keychain 裡的 secret 一併刪掉
- **Add 2FA Account** — 貼上 `otpauth://` URI，或手動填 setup key。

## 安裝

### Tinycast，從這個 repo 裝

在 Settings → Extensions 把 `https://github.com/TokuiNico/raycast-simple2fa` 加成
registry，然後搜尋 **Simple 2FA**。Tinycast 會抓 `extensions/raycast-simple2fa/`
這個資料夾，裝依賴再建置。你的機器要有 Node 跟套件管理工具。

### Tinycast，自己建置

```
cd extensions/raycast-simple2fa
npm install
npm run build
```

然後 Settings → Extensions → Install New → **Add Folder…**，選剛產生的 `build/`。

### Raycast

```
cd extensions/raycast-simple2fa
npm install
npm run dev
```

`ray develop` 會裝進你本機的 Raycast，並開著 hot reload。

## 為什麼用 Keychain

TOTP 的 secret 是長期有效的憑證。誰讀到它就能一直算出你的驗證碼，所以不該放在任何
process 都打得開的檔案裡。

兩個 host 都沒有提供安全的地方：

- Raycast 的 extension API 沒有 Keychain 介面。
- Tinycast 有用 Keychain，但只給它自己管理的 OAuth token。Extension 的
  `LocalStorage` 在 Tinycast 是明文 JSON，位置在
  `~/Library/Application Support/<bundle id>/extension-data/`。

所以這個 extension 透過 `security` CLI 直接存取 Keychain。代價寫在
[SECURITY.md](SECURITY.md)：寫入 secret 時，它會出現在 process 的 argument list，
持續那一次呼叫的時間。

## 為什麼不上 Raycast Store

Raycast 的上架規範寫著：

> Extensions requesting Keychain Access will be rejected due to security concerns.

— [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)

Keychain 就是這個 extension 的核心，所以上不了。Raycast 自己的 `LocalStorage` 是加密
資料庫，能上架的版本會改成把 secret 存在那裡——那是另一套設計，不是同一份 code 加個
開關。

請從這個 repo 安裝，用上面任一種方式。

## 資料放在哪

| 內容 | 位置 |
| --- | --- |
| Secret | macOS Keychain，service `com.tinycast.simple2fa`，account 是 `issuer:name` |
| Issuer、帳號名稱、algorithm、digits、period | Host 的 `LocalStorage` |

解除安裝 extension 不會清掉 Keychain 裡的東西。清理方式看
[SECURITY.md](SECURITY.md)。

## 開發

```
cd extensions/raycast-simple2fa
npm install
npm test          # vitest
npm run build     # ray build -e dist -o build
```

TOTP 比對 RFC 6238 的 test vectors，SHA1、SHA256、SHA512 都有。Keychain 那層把
`security` 的呼叫抽成可注入的參數，測試驗證組出來的參數，不動真的 Keychain。

有一個測試會先把 `Buffer.prototype.writeUInt32BE` 拿掉再跑。Tinycast 的 `buffer`
shim 沒有這個方法，Node 有，少了這個測試就會發生本機過、進 Tinycast 炸掉。

## License

[MIT](LICENSE)
