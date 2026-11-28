# 原生首屏驗收基線 / Native shell screenshot baselines

每張圖皆是固定視口、減少動態效果、獨立 Chromium 瀏覽器實際呈現的畫面。
基線只包含原生標題與設定介面，不包含遊戲內劇情、地圖或固定劇情文字。
視覺素材的權利聲明見專案 `ASSETS.md` 與 `licenses/`。
Every image is a real browser screenshot at a fixed viewport with reduced motion in an isolated Chromium context.
Baselines cover native title and preferences screens only, not story, map or dialogue content.
See the project's `ASSETS.md` and `licenses/` for the artwork rights notices.

| 命名 / Name | 狀態 / State |
|---|---|
| `root-title-zh` | 首次資料準備顯示可重試錯誤，繁體中文 / retryable first data-preparation error, Traditional Chinese |
| `root-settings-en` | 設定視窗開啟，English / preferences modal, English |
| `runtime-title-en` | 資料準備完成，正式遊戲標題，English / prepared data, game title, English |

每種狀態各有 1280×800、390×844、844×390 與 768×1024 四種尺寸。
The four viewports per state are 1280×800, 390×844, 844×390 and 768×1024.

## 複跑 / Reproduce

在倉庫根目錄安裝標準測試依賴後，在 JY 目錄執行：
After installing the repository's test dependencies, run in JY:

```sh
node --test test/*.test.mjs
node test/accept.mjs
```

瀏覽器驗收包含：首次資料故障→取消→真正重試→正式標題→新旅程場景落地，
並在獨立、空白測試瀏覽器內植入不相容的合成紀錄，驗證取消復原及明確確認後原紀錄備份。
畫面與按名稱操作是不同檢查；實際圖像和 native semantics 均會驗證。
The browser walk includes the failed preparation, cancellation, real retry, runtime title, scene-entry,
and a synthetic incompatible save in its isolated test browser. It verifies both cancelled and confirmed recovery.
It checks actual screenshot pixels separately from named native semantic actions.

- `--capture --out <new-directory>`：只收集可供人工審視的實拍與驗收報告，不修改基線。
  Collect candidate screenshots and a receipt without changing the baseline.
- `--update`：只在逐張確認新圖應替換基線時使用；不能當成通過測試的手段。
  Use only after reviewing and approving replacement images, not to silence a regression.
- `--webkit --capture --out <new-directory>`：WebKit iPhone 視口配置回歸；不與 Chromium 截圖作跨瀏覽器逐像素比較。
  WebKit iPhone-profile regression, without comparing a different browser's raster against a Chromium baseline.
- `--shell-only`、`--sizes 844x390`、`--no-recovery`：縮小局部診斷範圍，不代表完整驗收。
  Narrow diagnostic runs are not full acceptance.

測試資料與差異圖寫到 `diff/`（不提交）。使用既有本機瀏覽器可指定 `CHROMIUM_PATH`；
沒有實體手機或手柄，不將視口或觸屏自動化稱作真機驗收。
Receipts and pixel diffs under `diff/` are not tracked. `CHROMIUM_PATH` selects an existing Chromium executable.
Viewport and touch emulation do not qualify physical phones or gamepads.
