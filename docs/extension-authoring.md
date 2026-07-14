# 声明式扩展作者指南

UAEM v1（UnicodeArtJs Extension Manifest）用于交付可验证的本地字符画资源包。它适合
艺术字字体、语义文档模板和同类数据资产，不是 JavaScript 插件运行时。一个 UAEM 包不会
安装依赖、执行代码、请求网络或修改宿主配置。

本文面向希望制作、侧载或提交资源包的作者。具体字段约束以
[UAEM v1 清单规范](extension-manifest.md)和 Core 校验结果为准。

## 先确认适用范围

UAEM v1 仅支持以下资源：

- `unicode-art-font`：UTF-8 的 `.uafont.json` Unicode 艺术字字体。
- `semantic-document`：UTF-8 的 `.uadoc.json` 版本化语义文档。

以下内容不能放入 v1 包：JavaScript、WASM、shell 命令、二进制程序、远程 URL、压缩包、
安装钩子和自动更新逻辑。需要动态代码、权限、签名或市场分发时，必须等待新的格式版本和
独立的权限模型；不能以“资源文件”的名义绕过这一限制。

## 最小目录

建议一个扩展包只放它自己需要的资源，并将清单固定在目录根部：

```text
my-banner-pack/
  unicode-art-extension.json
  assets/
    my-font.uafont.json
    welcome-template.uadoc.json
  README.md
  LICENSE
```

资源路径必须相对 `unicode-art-extension.json` 编写，使用 POSIX `/` 分隔符。例如
`assets/my-font.uafont.json` 是有效路径；`../font.json`、`assets\\font.json`、`/font.json`
和 `assets//font.json` 都会被拒绝。Core 负责清单语法校验；具有文件系统权限的宿主还会在
读取时执行真实路径包含关系检查，以防符号链接指向包外。

## 编写清单

下面的结构可作为起点。替换 ID、作者、版本范围、资源名称和许可证信息，且不要复用官方
扩展的 `meta.id`：

```json
{
  "format": "unicode-art-extension",
  "version": 1,
  "meta": {
    "id": "org.example.my-banner-pack",
    "name": "My Banner Pack",
    "authors": ["Example Author"],
    "description": "A small local Unicode Art resource pack.",
    "license": {
      "expression": "MIT",
      "origin": "original"
    }
  },
  "capabilities": ["unicode-art-font", "semantic-document"],
  "compatibility": {
    "minCoreVersion": "1.2.1",
    "maxCoreVersionExclusive": "2.0.0",
    "targets": ["cli", "web", "vscode", "desktop"]
  },
  "resources": [
    {
      "id": "my-font",
      "kind": "unicode-art-font",
      "path": "assets/my-font.uafont.json",
      "name": "My Font"
    }
  ]
}
```

`capabilities` 必须覆盖每个 `resources[].kind`。`minCoreVersion` 是必填的
`major.minor.patch` 版本；`maxCoreVersionExclusive` 是可选开区间上界。只有在你确实测试过
目标宿主时才把它加入 `targets`，省略 `targets` 表示不对宿主类别做限制，并不等于所有宿主
都已经验证可用。

## 许可与来源

每个扩展都需要在 `meta.license` 中给出受支持的 SPDX 表达式和来源状态。原创资源应使用
`"origin": "original"`。导入或派生资源必须补充 `sourceUrl` 与 `attribution`，并且作者有
责任确认再分发权限。

清单通过 Core 校验只代表结构和机器规则通过，不是法律意见，也不自动使资源符合官方随包或
画廊收录标准。官方渠道还会审查许可证兼容性、来源、署名、可复现性和内容安全。

## 本地验证

从 UnicodeArtJs 仓库根目录运行以下命令。它们只读取显式给出的本地文件，不会安装、注册或
执行你的扩展：

```powershell
npm run build:core
node packages/cli/src/console.js extension validate .\my-banner-pack\unicode-art-extension.json --lang zh-CN
node packages/cli/src/console.js extension inspect .\my-banner-pack\unicode-art-extension.json --json

node packages/cli/src/console.js font validate .\my-banner-pack\assets\my-font.uafont.json --lang zh-CN
node packages/cli/src/console.js document .\my-banner-pack\assets\welcome-template.uadoc.json --height 12
```

按实际资源替换最后两条命令。`extension validate` 会检查清单及已声明资源；`inspect --json`
可用于脚本或 CI；UAF 与语义文档命令可在资源层面给出更具体的错误。

浏览器工作台当前可以检查单个清单并显示兼容性，但浏览器选择一个 JSON 文件后没有相邻目录
的自动读取权限，因此不会加载其引用资源。CLI 才适合对完整本地目录执行资源预检。

## 提交或分发前检查

1. 运行清单校验，并单独校验每份 UAF/语义文档资源。
2. 确认每个资源路径都是相对 POSIX 路径，且没有未声明文件依赖。
3. 使用目标 Core 版本和目标宿主实际试用，而不是仅依赖 `targets` 声明。
4. 核对 `meta.id` 唯一、作者和许可证信息完整，派生资源的来源与署名可追溯。
5. 不包含可执行代码、远程内容入口、私密信息或受限再分发资产。
6. 提供简短 README，说明资源用途、授权方式、兼容版本和验证命令。

项目内的[Line Banner 示例](../packages/extension-line-banner/README.md)是原创 MIT 资源，展示
一份 UAF 字体与一份语义模板如何共用同一份 UAEM 清单。它是开发与回归基线，不是扩展市场或
自动安装器。

## 兼容性与治理承诺

UAEM v1 仍是 experimental。未来添加资源种类、动态行为、签名、联网分发或权限，都会通过新
格式版本与公开迁移说明进行，而不会改变 v1 的“仅本地、仅声明式、无代码执行”边界。作者应
把 `format`、`version`、兼容范围和资源 ID 视为长期契约；宿主应把不兼容原因展示给用户，
而不是静默忽略资源。
