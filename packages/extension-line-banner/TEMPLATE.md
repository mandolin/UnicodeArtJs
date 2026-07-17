# UAEM 资源包复制模板

这个目录可以作为最小 UAEM v1 资源包模板。复制时请把下面字段改成你自己的值，不要复用官方 `meta.id`、资源 ID 或资源名称。

## 推荐目录

```text
my-extension/
  unicode-art-extension.json
  assets/
    my-font.uafont.json
    my-template.uadoc.json
  README.md
  LICENSE
```

## 必改字段

- `meta.id`：使用反向 DNS 风格，例如 `org.example.my-extension`。
- `meta.name`、`meta.authors`、`meta.description`：写清楚资源包用途和作者。
- `meta.license`：原创资源可使用 MIT、Apache-2.0、BSD、CC0 等宽松许可证；导入或派生资源必须补 `sourceUrl` 与 `attribution`。
- `meta.creation`：说明创作方式。AI 辅助、导入或派生资源应保留可追溯说明。
- `compatibility.minCoreVersion`：写你实际验证过的最低 Core 版本。
- `compatibility.targets`：只写实际验证过的宿主。
- `resources[]`：每个资源必须有唯一 `id`、正确 `kind` 和相对 POSIX 路径。

## 资源规则

- `unicode-art-font` 资源使用 `.uafont.json`。
- `semantic-document` 资源使用 `.uadoc.json`。
- 路径必须相对 `unicode-art-extension.json`，使用 `/` 分隔。
- 不能包含 JavaScript、WASM、shell 命令、远程 URL、安装脚本或自动更新入口。
- 宿主只应读取 `resources[]` 中声明的文件。

## 本地验证

从 UnicodeArtJs 仓库根目录运行：

```bash
npm run build:core
node packages/cli/src/console.js extension validate path/to/my-extension/unicode-art-extension.json --lang zh-CN
node packages/cli/src/console.js extension inspect path/to/my-extension/unicode-art-extension.json --json --lang zh-CN
node packages/cli/src/console.js font validate path/to/my-extension/assets/my-font.uafont.json --lang zh-CN
node packages/cli/src/console.js document path/to/my-extension/assets/my-template.uadoc.json --height 12 --no-config --lang zh-CN
```

如果你的包没有字体或语义文档资源，删除对应命令。发布、投稿或提交官方示例前，还应确认 README、LICENSE、来源说明和验证命令齐全。
