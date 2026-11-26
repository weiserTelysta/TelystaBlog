# 百合与缎带制作记录

## 生成

这张图由 `image_gen` 一次生成。调用时设置 `transparent_background: true`，输入是一段英文提示词。参考图的处理方式是先把想保留的质感写进提示词，工具调用只传文字。原始输出是 1202 × 1308、带 alpha 通道的 PNG，保存于本机 `~/.codex/generated_images/01a19d71-2b48-7851-b472-015eec9cc995/exec-eae819d2-7815-4a12-adf3-bf38c9d186ab.png`。

以下是实际传给工具的提示词。制作同系列新图时，可以从这里替换主题和细节。

```text
Create a new, original, high-end botanical spot illustration for the Marginalia page of a quiet dark fantasy anime literary blog. Transparent background, cutout, no background paper or flat rectangle. Fully bloomed ivory lilies in a graceful diagonal crescent, two flowers at different angles, one small bud, airy slender sepia-green leaves and a narrow muted vermilion silk ribbon in a looping curve. Capture the reference's broad qualities of thin warm ink outlines, interior petal veins, finely layered semi-translucent watercolor, faded blush shading, tea-stain detail and deep crimson stamens. Design a distinct original silhouette and pose: the larger bloom opens left and slightly upward, has rolled petal tips and crossed stamens, the second opens down and right, a stem arcs upward behind it. One flowing strip of ribbon loosely wraps around the stems and falls along the outer right edge. Build edges that remain clear on #070a10 and leave breathing room around the entire sprig. Elegantly asymmetric, painterly detail, refined Japanese fantasy book ornament, cream, warm chalk, dusty red and taupe, slight transparent fringes, rich but delicate. Aspect ratio portrait or square. No characters, border, typography, watermark, checkerboard or cast background silhouette.
```

## 验收和导出

原图自带透明度。先用 Sharp 输出一张 400 px 宽、铺上网站底色 `#070a10` 的 PNG，用来查看花瓣边缘和半透明笔触。通过后，从同一张透明原图按比例缩到 560 px 宽，用 `quality: 84`、`alphaQuality: 95` 编码 WebP。以下命令从仓库根目录运行，把两个结果写到 `.tmp/visual-optimization/`。

```bash
master=~/.codex/generated_images/01a19d71-2b48-7851-b472-015eec9cc995/exec-eae819d2-7815-4a12-adf3-bf38c9d186ab.png
mkdir -p .tmp/visual-optimization
node --input-type=module - "$master" <<'JS'
import sharp from 'sharp';

const source = sharp(process.argv[2]);
const meta = await source.metadata();
if (!meta.hasAlpha) throw new Error('Expected an original PNG with alpha');

await source.clone().resize({ width: 400 }).flatten({ background: '#070a10' })
  .png().toFile('.tmp/visual-optimization/lilies-proof.png');
await source.resize({ width: 560 }).webp({ quality: 84, alphaQuality: 95 })
  .toFile('.tmp/visual-optimization/lily-and-ribbon.webp');
JS
cmp .tmp/visual-optimization/lily-and-ribbon.webp src/assets/images/decorations/lily-and-ribbon.webp
```

[站点素材](../src/assets/images/decorations/lily-and-ribbon.webp)为 560 × 609、120,636 字节，保留透明度。用原始 PNG 重新导出已验证与成品逐字节一致。提示词用于生成新变体，精确复现使用原始 PNG。
