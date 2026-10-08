# 🏹 體感彈弓射水果 — 專案說明

> 體感 1 分鐘限時挑戰:用你的雙手當彈弓,擊落樹上的水果!
> 專為長輩設計的簡單手勢:不需要按任何按鈕,用身體動作就能玩。

## 🔗 測試連結

**線上版(GitHub Pages,給別人測試用):**

```
https://951222-1.github.io/fruit/
```

- 開連結 → 點「立即啟動 Webcam」→ 允許攝影機權限 → 開始遊戲
- 需要 webcam;瀏覽器會要求權限(HTTPS 才能開 camera,GitHub Pages 剛好符合)

**本機開發:**

```bash
cd C:/aiii/bone-next/水果
npm install
npm run dev          # http://127.0.0.1:5175
```

## 🎮 玩法(三步驟)

| 步驟 | 動作 | 說明 |
|:---:|---|---|
| 1 | **雙手併攏舉高過肩** ✋ | 雙手靠近併攏,舉到肩膀以上,彈弓皮兜自動吸附 |
| 2 | **往下拉弓** ⬇ | 併攏的雙手一口氣往下拉過肩!拉得越低射得越高,可左右微調準星 |
| 3 | **續力 3 秒發射** ⏱️ | 拉住皮兜續力 3 秒,蓄力圈蓄滿瞬間彈丸自動破空射出! |

- 60 秒內擊落越多水果分數越高(青蘋果 20 分 > 水蜜桃 15 分 > 其他 10 分)
- 中途把手拉回肩上或放開雙手 = 取消蓄力(不會誤射)
- 被打落的水果 2.5 秒後會長回來,可以一直打

## 🛠 技術架構

- **Vite + 原生 JavaScript**(無框架)
- **MediaPipe Tasks-Vision**:Pose Landmarker(骨架/肩膀)+ Hand Landmarker(雙手),GPU 優先、CPU 自動降級,模型 100% 本地載入
- **Canvas 2D**:全手繪 UI(水果、彈弓、卡通手、教學卡、結算木牌)
- **Web Audio API**:音效即時合成,無音檔

```
src/
├── main.js                  # UI 殼 + 主迴圈(偵測 → 繪製 → 狀態列)
├── game/slingshotGame.js    # 遊戲狀態機、手勢判定、蓄力、物理
├── render/gameRenderer.js   # Canvas 繪製(水果/彈弓/教學卡/結算)
├── render/cartoonHands.js   # Q 版卡通手(握拳/張掌)
├── services/vision.js       # MediaPipe 引擎封裝
├── services/camera.js       # webcam 生命週期
└── services/audio.js        # Web Audio 音效合成
```

## ⚙️ 判定邏輯(狀態機)

```
IDLE ──(併攏 + 舉高過肩)──→ READY(吸附皮兜)
READY ──(併攏 + 拉到肩下45px,連續4幀)──→ PULLING(開始蓄力)
PULLING ──(續力滿3秒)──→ 自動發射 → IDLE
PULLING ──(手拉回肩上25px內 / 雙手分開超過0.25秒)──→ 取消,不發射
```

### 可調參數(都在 `src/game/slingshotGame.js`)

| 參數 | 預設值 | 說明 |
|---|---|---|
| `CHARGE_REQUIRED_MS` | 3000 | 續力發射秒數 |
| 併攏門檻 | `min(180, width*0.25)` | 雙手距離小於此值 = 併攏 |
| 過肩容差 | +15px | 手中點低於肩線多少內算「過肩」 |
| 進入拉弓 / 取消拉弓 | 肩下 45px / 25px | 遲滯帶,防臨界抖動 |
| 平滑係數 | 手 0.45 / 肩 0.3 | 指數平滑,越小越穩、越大越靈敏 |
| 防抖幀數 | 併攏 3 幀 / 拉弓 4 幀 | 連續命中才切換狀態 |
| 手遺失寬限 | 600ms(拉弓中) | 短暫抓不到手不會中斷蓄力 |
| 手分開寬限 | 250ms | 微分開不會誤判放手 |

## 🚢 部署(更新線上版)

```bash
# 1. 建置(一定要 --base=./,否則 GitHub Pages 子目錄會 404)
npm run build -- --base=./

# 2. 把 dist/ 推到 gh-pages 分支
git add -A && git commit -m "update"
git push origin main
git subtree push --prefix dist origin gh-pages
```

GitHub Pages 設定:`gh-pages` 分支(根目錄)為 Pages 來源。

> ⚠️ 模型與 wasm 路徑必須用**相對路徑**(`vision.js` 已改好),絕對路徑 `/models/...` 在子目錄部署會壞。

## 💾 備份

- 穩定版快照:`C:\aiii\bone-next\水果_backup_20261006_v-穩定版\`(含 `備份資訊.md`:ports、參數、啟動指令)
- GitHub 原始碼:`https://github.com/951222-1/fruit`(public)
- 進度報告資料庫:`951222-1/html-progress-sync` 進度 #0008

## 📌 已知事項 / 待辦

- [ ] 4:3 攝影機來源時,video 以 `object-fit: cover` 顯示會裁切,overlay 座標可能與實際手位置錯位(16:9 webcam 不受影響)
- [ ] `ai_sync.py` 中文標題 push 會 `UnicodeEncodeError`(URL 未編碼),目前以 ASCII 檔名繞過
- [ ] 新功能開發中(port 5176/5177 預留)

## 📄 授權 / 作者

- 專案持有者:951222-1
- 開發協助:Hermes Agent(2026-10)
