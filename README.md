# 菜谱动画视频管线 Recipe Animation Video Pipeline

竖屏 1080×1920 / 30 fps / H.264 + AAC，yuv420p，faststart。画面用 **Three.js 真 3D**，Puppeteer + SwiftShader 按确定性时间 `render(t)` 逐帧渲染。

本仓库的 `lib/` 曾未同步进 git；v2 已补回 `kit.js` / `render.js` / `synth.py` / `master.sh` / `check.py` / `contact.py`。

## EP17 v2（本轮）

- 先修字幕、烹饪步骤与用量 pill 对比度；**不发布、不上传、不接触凭证**。
- 标题：`慢炒焦糖洋葱+焗芝士！家常法式洋葱汤 French Onion Soup 🧅`
- 去掉全部「一拉 / 拉丝」文案；芝士表现为融化冒泡焦黄，不做拉丝。
- HUD 安全区 x 70–1010、y 150–1600；用量 pill 改为金底黑字；中文大标题金字+深色描边。
- 步骤 3–5 含真实火候，并标明动画已浓缩。

```
./make.sh episodes/ep17-french-onion-soup /workspace/ep17-french-onion-soup.mp4
```

静帧预览：

```
node lib/render.js episodes/ep17-french-onion-soup --stills 0.8,12,21,42,59,90,94,108
```
