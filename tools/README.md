# tools/

离线辅助脚本，不参与游戏运行时。

- `pixelate.py` — 参考实现：把图片压成像素拼豆（中心裁方 → downscale → LAB k-means 量化）。浏览器端的等价实现在 [`../src/lib/pixelate.ts`](../src/lib/pixelate.ts)，算法一致但去掉了 `rembg` 依赖。

## 使用 pixelate.py

```bash
python3 pixelate.py input.png output.png --grid 32 --colors 8
```

依赖：`numpy`、`Pillow`；如需自动抠图再装 `rembg`。
