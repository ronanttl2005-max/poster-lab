# assets/fonts

海报模板用到的自托管字体。**这个目录目前是空的**，需要手动放入下面 4 个 `.woff2` 文件。

没有这些文件时页面不会报错也不会白屏：`css/style.css` 里的 `@font-face` 会静默失败，
所有用到的地方都写了 fallback 栈（Didot / Bodoni / Georgia、Impact / Arial Narrow、Menlo），
文件放进来之后自动升级，不需要改代码。

## 需要的文件

| 文件名 | 字体 | 字重 / 样式 | 用在哪 |
| --- | --- | --- | --- |
| `playfair-display-700.woff2` | Playfair Display | 700 normal | `photo-serif` 大衬线独白、`halftone-editorial` 标题 |
| `playfair-display-700italic.woff2` | Playfair Display | 700 italic | `photo-serif` 里 `*斜体*` 标记的词 |
| `anton-regular.woff2` | Anton | 400 normal | `road-slogan`、`data-bar-photo`、`pop-deadline` 的压缩大标题 |
| `space-mono-400.woff2` | Space Mono | 400 normal | `blueprint-spec` 参数卡、各模板脚注小字 |

文件名必须完全一致（小写、连字符），`@font-face` 里是硬编码的路径。

## 下载方式

三个字体都是 SIL Open Font License 1.1，可以自托管。

- Playfair Display — https://fonts.google.com/specimen/Playfair+Display
- Anton — https://fonts.google.com/specimen/Anton
- Space Mono — https://fonts.google.com/specimen/Space+Mono

Google Fonts 网页版下载的是 `.ttf`，需要转成 `woff2`。两种办法：

**A. 从 google-webfonts-helper 直接拿 woff2**（最省事）

https://gwfh.mranftl.com/fonts — 搜字体名，字重只勾上表里需要的，charset 勾 `latin`
（模板里这几个字体只用来排英文，勾 latin 就够，体积能小一个量级），下载后重命名。

**B. 自己转**

```sh
# macOS: brew install woff2
woff2_compress PlayfairDisplay-Bold.ttf      # 产出 PlayfairDisplay-Bold.woff2
```

然后按上表重命名。

## 为什么不用 CDN

`AGENTS.md` 要求零构建、双击 `index.html` 也能跑。挂 `fonts.googleapis.com` 的话离线就退化，
而且每次导出 PNG 都要等外部请求，`html-to-image` 有概率抓不到字体导致导出图和预览不一致。
自托管 + `font-display: swap` 是最稳的。

## 体积提醒

四个文件 latin 子集加起来大约 100–150 KB。如果之后要给中文标题也换字体，
**不要**整包塞进来（思源黑体一个字重就 8 MB+），需要先做子集化。
