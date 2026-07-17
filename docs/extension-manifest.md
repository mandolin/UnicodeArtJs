# 声明式扩展清单

UnicodeArtJs Extension Manifest（UAEM）v1 是一份 JSON 清单，用于描述一个本地
资源扩展包。它目前只支持两类资源：

- semantic-document：版本化语义文档，文件后缀为 .uadoc.json。
- unicode-art-font：Unicode 艺术字字体，文件后缀为 .uafont.json。

如果你要创建扩展包，请先阅读[声明式扩展作者指南](extension-authoring.md)。如果你要接入宿主
或做自动化侧载验证，请同时阅读[声明式扩展 SDK](extension-sdk.md)和
[宿主侧载与资源读取边界](host-sideload-boundary.md)。本文只定义清单格式、
兼容性与安全约束。

UAEM v1 不是通用脚本插件格式。清单不能声明 JavaScript、WASM、shell 命令、网络
下载地址或安装钩子。Core 只校验清单结构和兼容性；文件读取、真实路径复核、资源解析
和用户信任提示由各宿主负责。

## 清单结构

一个最小清单包含格式、版本、元数据、能力、兼容性和本地资源：

    {
      "format": "unicode-art-extension",
      "version": 1,
      "meta": {
        "id": "org.example.banner-pack",
        "name": "Example Banner Pack",
        "authors": ["Example Author"],
        "license": {
          "expression": "MIT",
          "origin": "original"
        }
      },
      "capabilities": ["unicode-art-font"],
      "compatibility": {
        "minCoreVersion": "1.2.1",
        "targets": ["cli", "web"]
      },
      "resources": [
        {
          "id": "line-font",
          "kind": "unicode-art-font",
          "path": "assets/line-font.uafont.json"
        }
      ]
    }

meta.id 使用反向 DNS 风格标识。派生或导入资源必须在 license 中提供 sourceUrl 和
attribution。许可证字段会接受受限 SPDX 表达式；是否可作为官方随包资产还需由项目的
宽松许可证政策和人工审计共同决定。

## 兼容性

compatibility.minCoreVersion 是必填的 major.minor.patch 版本。可选的
maxCoreVersionExclusive 是开区间上界；宿主版本达到该值时视为不兼容。
compatibility.targets 可限制 node、browser、cli、web、vscode 或 desktop 宿主。

Core 提供 parseUnicodeArtExtensionManifestJson、validateUnicodeArtExtensionManifest
和 evaluateUnicodeArtExtensionCompatibility。后者不会读取资源，返回目标不匹配、
Core 版本过低或过高、能力缺失等机器可读原因，便于宿主向用户解释结论。

## 安全要求

清单中的资源路径必须是相对 POSIX 路径，不能以斜杠开头，不能包含反斜杠、连续斜杠、
点目录或父目录。Core 进行这层语法校验后，Node 等宿主还必须在读取时对 manifest 根目录
和资源的 realpath 再次做包含关系检查，以避免符号链接逃逸。

浏览器选择单个 JSON 文件后无法自动获得相邻目录的读取权限。因此 Web 当前只解析所选
manifest 并报告兼容性，不加载其资源。CLI 的 extension validate 会在本地根目录内读取
并分别校验所有声明资源。

## CLI 侧载预检

在仓库开发态可检查官方示例：

    npm run build:core
    node packages/cli/src/console.js extension validate packages/extension-line-banner/unicode-art-extension.json --lang zh-CN

查看机器可读摘要：

    node packages/cli/src/console.js extension inspect packages/extension-line-banner/unicode-art-extension.json --json

这两个命令不会安装、注册或执行扩展；它们只是一次显式、本地的预检。

## 官方示例

packages/extension-line-banner 是一个原创、MIT 标注的 UAEM v1 示例包。它包含一份
UAF 艺术字字体、一份语义文档模板、独立 LICENSE 和可复制的 TEMPLATE.md，用于 Core、CLI、Web
和未来宿主的回归测试。

需要带权限的动态代码扩展、签名、市场、远程分发或自动更新时，项目会另行设计新的
格式版本与权限模型，不会在 UAEM v1 中静默扩大能力。
