import * as vscode from 'vscode';
import { getNonce } from '../utils/nonce';

export function getConverterHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));

  return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>UnicodeArtJs Converter</title>
</head>
<body>
  <main class="app">
    <header class="header">
      <div>
        <h1>UnicodeArtJs</h1>
        <p class="subtitle" data-i18n="web.subtitle">VSCode converter preview</p>
      </div>
      <div class="header-actions">
        <button id="convertText" type="button" data-i18n="web.convert">Convert</button>
        <button id="cancelConvert" type="button" disabled data-i18n="web.cancel">Cancel</button>
        <button id="copyResult" type="button" data-i18n="web.copy">Copy</button>
        <button id="insertResult" type="button" data-i18n="web.insert">Insert</button>
        <button id="saveDefaultTemplate" type="button" data-i18n="web.saveDefaultTemplate">Save Default Template</button>
        <select id="templateSlot" title="Template slot"></select>
        <button id="saveTemplateSlot" type="button" data-i18n="web.saveTemplate">Save Template</button>
      </div>
    </header>

    <section class="layout">
      <aside class="panel controls-panel">
        <div class="field">
          <label for="mode" data-i18n="web.mode">Mode</label>
          <select id="mode">
            <option value="text" data-i18n="web.textBanner">Text Banner</option>
            <option value="image" data-i18n="web.image">Image</option>
          </select>
        </div>

        <div class="field">
          <label for="input" data-i18n="web.inputText">Input Text</label>
          <textarea id="input" rows="5">UnicodeArtJs</textarea>
        </div>

        <div class="field" id="imageInputWrap" hidden>
          <label for="imageInput" data-i18n="web.imageFile">Image File</label>
          <input id="imageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp">
          <span id="imageName" class="hint" data-i18n="web.noImageSelected">No image selected</span>
        </div>

        <div class="grid two">
          <div class="field">
            <label for="height" data-i18n="web.height">Height</label>
            <input id="height" type="number" min="1" max="300">
          </div>
          <div class="field">
            <label for="width" data-i18n="web.width">Width</label>
            <input id="width" type="number" min="1" max="1000" placeholder="Auto" data-i18n-placeholder="web.auto">
          </div>
        </div>

        <div class="field">
          <label for="charset" data-i18n="web.charset">Charset</label>
          <select id="charset"></select>
        </div>

        <div class="field" id="customCharsWrap">
          <label for="customChars" data-i18n="web.customChars">Custom Chars</label>
          <input id="customChars" type="text" placeholder=" .:-=+*#%@">
        </div>

        <div class="field">
          <label for="font" data-i18n="web.visualFont">Visual Font</label>
          <input id="font" type="text" list="visualFontOptions">
          <datalist id="visualFontOptions"></datalist>
        </div>

        <div class="field">
          <label for="glyphFont" data-i18n="web.glyphFont">Glyph Font</label>
          <input id="glyphFont" type="text" list="glyphFontOptions" placeholder="Consolas, 'Courier New', monospace">
          <datalist id="glyphFontOptions"></datalist>
          <span class="hint" data-i18n="web.fontHint">Visual font affects text rendering before conversion; glyph font affects preview, HTML export, and editor display.</span>
          <span id="fontWarning" class="hint warning" hidden></span>
        </div>

        <div class="grid two">
          <div class="field">
            <label for="matrixSize" data-i18n="web.matrix">Matrix</label>
            <input id="matrixSize" type="number" min="2" max="32">
          </div>
          <div class="field">
            <label for="ratio" data-i18n="web.ratio">Ratio</label>
            <input id="ratio" type="number" min="0.1" max="10" step="0.1">
          </div>
        </div>

        <div class="grid two">
          <label class="checkbox">
            <input id="invert" type="checkbox">
            <span data-i18n="web.invert">Invert</span>
          </label>
          <label class="checkbox">
            <input id="trimTrailingSpaces" type="checkbox">
            <span data-i18n="web.trimSpaces">Trim Spaces</span>
          </label>
        </div>

        <div class="field">
          <label for="fontReduce" data-i18n="web.fontReduce">Font Reduce</label>
          <input id="fontReduce" type="number" min="0" max="20">
        </div>

        <section class="subpanel">
          <label class="checkbox">
            <input id="boxEnabled" type="checkbox">
            <span data-i18n="web.enableBox">Enable Box</span>
          </label>
          <div class="field">
            <label for="boxStyle" data-i18n="web.boxStyle">Box Style</label>
            <select id="boxStyle"></select>
          </div>
          <div class="field">
            <label for="boxTitle" data-i18n="web.boxTitle">Box Title</label>
            <input id="boxTitle" type="text" placeholder="Optional" data-i18n-placeholder="web.optional">
          </div>
          <label class="checkbox">
            <input id="boxShadow" type="checkbox">
            <span data-i18n="web.boxShadow">Box Shadow</span>
          </label>
          <div class="grid two">
            <div class="field">
              <label for="boxPadding" data-i18n="web.padding">Padding</label>
              <input id="boxPadding" type="number" min="0" max="20">
            </div>
            <div class="field">
              <label for="boxMargin" data-i18n="web.margin">Margin</label>
              <input id="boxMargin" type="number" min="0" max="20">
            </div>
          </div>
        </section>

        <div class="field">
          <label for="insertMode" data-i18n="web.insertMode">Insert Mode</label>
          <select id="insertMode"></select>
        </div>

        <details class="subpanel advanced-panel">
          <summary data-i18n="web.advanced">Advanced</summary>
          <p class="hint" data-i18n="web.reservedWidthRules">Reserved width-rule fields. They are exposed for later mixed-width font tuning and do not fully solve all font metric differences yet.</p>
          <div class="field">
            <label for="glyphWidthProfile" data-i18n="web.glyphWidthProfile">Glyph Width Profile</label>
            <input id="glyphWidthProfile" type="text" placeholder="default">
          </div>
          <div class="field">
            <label for="wideCharRegex" data-i18n="web.wideCharRegex">Wide Glyph Regex</label>
            <input id="wideCharRegex" type="text">
          </div>
          <div class="grid two">
            <div class="field">
              <label for="outputTarget" data-i18n="web.outputTarget">Output Target</label>
              <select id="outputTarget"></select>
            </div>
            <div class="field">
              <label for="locale" data-i18n="web.locale">Language</label>
              <select id="locale"></select>
            </div>
          </div>
        </details>
      </aside>

      <section class="panel preview-panel">
        <div class="preview-toolbar">
          <div>
            <span id="statusText" data-i18n="web.initializing">Initializing...</span>
            <span id="resultMeta" class="meta"></span>
            <span id="templateStatus" class="meta"></span>
          </div>
          <progress id="progress" max="1" value="0"></progress>
        </div>
        <pre id="output" aria-live="polite"></pre>
        <div class="footer-actions">
          <button id="saveTxt" type="button" data-i18n="web.saveTxt">Save TXT</button>
          <button id="saveHtml" type="button" data-i18n="web.saveHtml">Save HTML</button>
        </div>
      </section>
    </section>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
