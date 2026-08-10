# Ultimate a-We — 區網串接說明

本包內容：

| 路徑 | 說明 |
|------|------|
| `app/` | 網頁展示程式 |
| `relay/` | 信號轉發（WebSocket） |
| `README.md` | 本說明 |
| `PROTOCOL.txt` | 協定速查 |

請在**同一區網**啟動 relay 與網頁，再用你的程式以 WebSocket client 送計數。

---

## 一、環境

- Node.js 18+（建議 20+）
- 跑網頁的電腦與你的機器在同一區網
- 瀏覽器：Chrome 或 Edge（需 WebGPU）

---

## 二、啟動網頁與 Relay

在跑展示的電腦開**兩個終端**。

### 終端 1 — Relay

```bash
cd relay
npm install
npm start
```

成功會看到：

```text
[relay] listening ws://0.0.0.0:8765
```

### 終端 2 — 網頁

回到本包根目錄：

```bash
npm run app
```

瀏覽器在**同一台電腦**開啟（請用 `localhost`，WebGPU 需要；`?ws=` 接到本機 relay）：

```text
http://localhost:4173/?ws=ws://127.0.0.1:8765
http://localhost:4173/sim?ws=ws://127.0.0.1:8765
```

| 路徑 | 用途 |
|------|------|
| `/` | 展示畫面（按 **D** 開關 Debug panel；**H** 開關 Leva） |
| `/sim` | 瀏覽器模擬送 `add`（可對照你的實作） |

查這台電腦的區網 IP（給下一步連線用）：

```bat
ipconfig
```

---

## 三、從你的程式送信號

1. 以 **WebSocket client** 連線：

   ```text
   ws://<展示機區網IP>:8765
   ```

2. 送 **文字 JSON**（非 binary），例如：

   ```json
   {"op":"add","typeId":"absorb","n":1,"id":"unique-id-001"}
   ```

3. 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `op` | ✅ | 固定 `"add"` |
| `typeId` | ✅ | 見下表 |
| `n` | ❌ | 增加量，預設 `1`，整數 ≥ 1 |
| `id` | ❌ | 去重；相同 id 只會加一次 |

4. `typeId`

| typeId | 中文 |
|--------|------|
| `absorb` | 接住型 |
| `reflect` | 反彈型 |
| `withdraw` | 隱身型 |
| `transform` | 轉化型 |
| `diffuse` | 模糊型 |

Relay 會把訊息轉給其他連線中的 client（含網頁）。你這邊只當 client，不必開 server。

### 範例

```json
{"op":"add","typeId":"reflect","n":1,"id":"2026-08-05T10:00:00Z-001"}
{"op":"add","typeId":"absorb","n":5,"id":"batch-42"}
```

---

## 四、檢查清單

- [ ] Relay 顯示 listening `8765`
- [ ] 防火牆允許入站 TCP **8765**
- [ ] 網頁已用 `http://localhost:4173/?ws=ws://127.0.0.1:8765` 開啟
- [ ] 按 **D** 開 Debug，Signal 為 `connected`
- [ ] 送出 `add` 後，畫面／Debug 計數有增加

---

## 五、常見問題

**Q: Signal 顯示 disconnected**  
A: 確認 relay 已開；網址需含 `?ws=ws://127.0.0.1:8765`。

**Q: 連上 relay 但畫面沒變**  
A: 檢查 `typeId` 拼字；看 relay 終端是否有連線 log；確認網頁 Signal 為 `connected`。

**Q: 黑畫面 / WebGPU**  
A: 用 Chrome/Edge；用 `http://localhost:...` 開網頁，不要只靠區網 IP 開瀏覽器。
