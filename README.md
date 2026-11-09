# 菜谱动画视频管线 Recipe Animation Video Pipeline

竖屏 1080×1920 / 30 fps / H.264 + AAC，yuv420p，faststart，时长 1–5 min。画面用 **Three.js 真 3D**（场景 / 相机 / 灯光 / 阴影 / 体积模型），Puppeteer 按确定性时间 `render(t)` 逐帧渲染；numpy 合成配乐和音效；ffmpeg 两遍 loudnorm 归一到 -14 LUFS、真峰值 ≤ -1 dBTP。没有任何外部素材或受版权保护的音乐。

```
recipe-videos/
├── make.sh                 # 一键：渲染 → 音频 → 母带/封装 → QA
├── upload_release.sh       # 上传成片到 GitHub Release（公开直链）
├── history.json            # 做过的菜 + 风格轮换表（每期必须更新）
├── lib/
│   ├── kit.js              # 2D HUD 叠加层（可换主题）：品牌行、STEP n/N、分段进度条、步骤标题、食材卡片（中英名 + 用量）、计时器、完整配方卡、fitText
│   ├── render.js           # 本地静态 HTTP（仅 localhost）+ Puppeteer + SwiftShader WebGL2；多 worker 逐帧 → build/frames → video_silent.mp4；--stills 出静帧
│   ├── synth.py            # 合成器 + 拟音库（pad/bass/pluck/lead/鼓、nylon/epiano/upright/rim/brush、倒液/切菜/嗞啦/铲子/摇盐/计时/叮…），limiter，Mix（自动 de-click）
│   ├── master.sh           # 两遍 loudnorm（linear）+ AAC 256k + faststart
│   ├── check.py            # QA：参数、响度/真峰值、爆音扫描、音画同步、从 MP4 抽检查帧 + 拼图
│   └── contact.py          # 拼图
└── episodes/<slug>/
    ├── timeline.json       # 唯一时间来源（步骤、食材卡片、动作事件、配方、风格）。画面和音频都读它，所以天然同步
    ├── index.html          # importmap（three）+ kit.js + scene.js
    ├── scene.js            # 本期 3D 场景
    ├── audio.py            # 本期配乐 + 音效
    └── build/
```
`episodes/_discarded/` 放废弃版本（只存档，不计入轮换）。

## 每期必须换风格（硬性规则）

每一期都要和**最近 3 期**明显不同，下面每个维度都要换（记录在 `history.json` 的 `rotation` 表和每期的 `style` 字段）：

| 维度 | 例子 |
|---|---|
| 材质/渲染 material | 黏土 clay、低多边形 low-poly、卡通描边 toon-outline、霓虹 neon、纸艺 paper-craft、写实 realistic、毛毡 felt、玻璃/亚克力、体素 voxel、水彩 NPR |
| 配色 palette | 奶油粉彩、暗底霓虹、大地色、高对比原色、单色+一个强调色… |
| 字体 fonts | 圆体（Fredoka/Baloo 2）、几何（Poppins/Orbitron）、衬线、等宽（JetBrains Mono）、中文 ZCOOL XiaoWei / Noto Sans CJK… |
| 构图 composition | 横向工作台三工位、俯拍平铺、居中单锅、等距 isometric 微缩、分屏… |
| 转场 transitions | 相机甩镜、匹配剪辑、擦除、缩放穿越、翻页… |
| 镜头运动 camera | 推拉、横摇、俯拍 → 45°、环绕、低角度仰拍、手持微晃… |
| 曲风 music | 不能和最近 3 期重复（见 rotation.music_styles） |

选好后先在 `history.json` 里新增本期条目（`status: in-progress`），再动手。

## 做新的一期

1. **选菜**：读 `history.json`，菜名不重复；菜系尽量和最近 2 期不同；按上表选一套新风格。挑动作好看的菜（倒液、切、炒、淋酱）。
2. **建目录**：`cp -r episodes/ep01-tomato-egg episodes/epNN-<slug>`，删掉 `build/`。
3. **写 `timeline.json`**：dish、style、duration（简单菜 60–180 s，好进 Shorts；复杂菜最长 300 s）、steps（中英标题 + 起止）、callouts（食材 `kind: ing`：中英名 + 用量；动作提示 `kind: act`）、`ev`（所有动作时间点）、recipe（完整配方）。必须从**空**锅/碗开始，到成品 + 配方页结束。
4. **3D 场景 `scene.js`**（Three.js r169，`import * as THREE from 'three'`，addons 在 `three/addons/`）：
   - **确定性**：只用 `render(t)` 的 t 驱动一切；随机数一律用 `K.rng(seed)` / `K.hash`，禁止 `Math.random`、`Date`、`performance.now`。
   - **枢轴（pivot）原则**：会倾倒的容器把 Group 原点放在**瓶口/碗唇/壶嘴**，旋转这个 Group；液流的起点 = 枢轴的世界坐标，所以液流一定从口里出来。液流用贝塞尔子段 TubeGeometry，终点落在锅/碗内表面（球面锅可用 `surfY(r)` 解析求表面高度）。容器内液面用世界水平裁剪面（`clippingPlanes`）保持水平。
   - **刀**：刀身平面 = 切面，刀刃朝下立在砧板上，下压同时沿切线推拉；落点就在食材上。切开用每片自己的裁剪面（局部坐标 → 每帧乘 `matrixWorld`），切面用 BackSide 果肉色补面，切下的片真的分开。
   - **锅铲**：按锅面法线建立正交基，铲面贴住锅壁，手柄向锅外上扬。
   - **镜头**：`KEYS = [t, target, yaw°, pitch°, dist]` 关键帧 + 缓动（可加一点手持晃动）。用 `cam.setViewOffset` 把主体压到 HUD 下方。
   - **安全区**：所有文字/HUD 在 x 70–1010、y 150–1600 内（避开 Shorts/TikTok 底部和右侧 UI），文字用 `K.fitText`（带 maxW）防截断；3D 主体不能挡住文字层（HUD 是画在 3D 之上的 2D 层）。
   - 换风格：`K.setTheme({...})` 改 HUD 配色/字体/面板样式（sticker / neon / flat），3D 部分改材质、灯光、配色、布景。
5. **静帧预览**：`node lib/render.js episodes/<slug> --stills 5,18.9,32.5` → `build/stills/`，`python3 lib/contact.py out.png …` 拼图，**亲自看**。检查清单：刀与切线方向一致、刀刃立着落在食材上；液流从瓶口出来落进锅里；锅铲角度对；没有穿模、没有出画；文字没被挡、没截断。`window.__dbg` 里有液流口/落点、锅铲点和法线，可在 Puppeteer 里读出来核对。
6. **音频 `audio.py`**：曲风要配合本期画面风格（和弦/BPM/配器用 synth.py），`cue(t, name, sig)` 把音效挂到 `E[...]` 时间上（记到 `sfx_cues.json`）。`STIR_HZ`、`WHISK_HZ` 要和 scene.js 一致。
7. **一键出片**：`./make.sh episodes/<slug> /workspace/<slug>.mp4`。SwiftShader 软件渲染，3D 场景约 1–1.5 帧/秒（7 worker），98 s 的片约 35–50 min；`KEEP_FRAMES=1` 保留帧，`node lib/render.js <ep> --encode-only` 只重编码。
8. **检查（全部通过才能发）**：
   - `build/qa/report.json` 的 `fails` 为空：分辨率 / fps / h264+aac / yuv420p / faststart / 时长 / I = -14±1 LUFS / TP ≤ -1.0 dBTP / 同步 ≤ 70 ms。
   - **亲自看** `build/qa/sheet*.png`（从最终 MP4 抽帧），按第 5 步的清单检查，有问题就改到通过。
9. **上传 + 发布**（每日定时任务在 QA 全部通过后自动执行），然后更新 `history.json`：链接、Buffer post id、状态、标题。

## 存储与发布

- **公开存储**：公开 GitHub 仓库 `lz19891013-hash/recipe-videos` 的 Release。
  `./upload_release.sh <tag> <视频.mp4>` → 打印公开直链（脚本会匿名下载验证）。用环境变量 `GITHUB_RECIPE_TOKEN`，**绝不打印、不写进日志或文件**。tag 建议 `epNN-<slug>`。
- **Buffer 发布参数**（MCP 命名空间 `user-Buffer`）：
  - 组织 **My organization** `6ad882b89652bb92d513252e`（账号时区 America/Los_Angeles，带时间统一写 `+08:00`）。
  - **YouTube** LzssdStudio：channelId `6ad9b3c5778b240e2f885dcb`，`metadata.youtube = { title: <≤100 字符标题>, categoryId: "26" }`。
  - **TikTok** lzssdstudio：channelId `6ad9bb3c778b240e2f88e317`。
  - X/Twitter `lizhuo62244657`：channelId `6ad88399778b240e2f7868e5`（可选）。
  - `schedulingType: automatic`；**`isAiGenerated` 不要打开**（用户不要标 AI）。
  - 视频必须是公开直链（上面的 Release 链接）。**先存草稿，确认没有报错，再发布。**
  - 免费版最多同时排 **10 条待发**，建帖前先查待发数量。
  - **用户已授权每日定时任务自动发布当天做好且验证通过的视频**（第一期是例外，已人工确认）。QA 任何一项没过就不发。
- **时长规则**：简单的菜尽量控制在 **3 分钟以内**（≤ 180 s，这样能进 YouTube Shorts，Shorts 要求竖屏 9:16 且 ≤ 3 分钟）；复杂的菜可以超过 3 分钟，**上限 5 分钟**（这时按普通竖屏视频发，不是 Shorts，标签里去掉 #Shorts）。
- **发布文案模板**（标题和简介分开写，都要抓眼球；每期给 2–3 个备选标题；不写任何“AI 生成”字样）：
  - **YouTube 标题**：≤ 100 字符，**前半句就是钩子**（中文为主 + 简短英文），例：`3个鸡蛋2个番茄，15分钟下饭神菜！🍅🍳 Tomato Egg Stir-Fry`
  - **YouTube 简介**：
    ```
    <钩子句（一句话戳痛点/给好处）>
    🧾 食材 Ingredients：<中文 用量 / English amount，逐行>
    👩‍🍳 步骤要点 Steps：1. … 2. … 3. …（每步一句，含关键火候/时间）
    💡 小技巧 Tip：<一句>
    #Shorts #<菜名> #家常菜 #<cuisine>Food #EasyRecipe #Cooking #<风格标签>
    ```
    categoryId 26（Howto & Style）。
  - **TikTok 文案**：第一行就是钩子标题；后面 1–2 句简短说明；最后一行标签（中英混合，5–8 个）。
- 渲染 / QA / 上传 / 发布任何一步没过就不发，并报告原因。
