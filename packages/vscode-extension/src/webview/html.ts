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
        <p class="subtitle">VSCode converter preview</p>
      </div>
      <div class="header-actions">
        <button id="convertText" type="button">Convert</button>
        <button id="cancelConvert" type="button" disabled>Cancel</button>
        <button id="copyResult" type="button">Copy</button>
        <button id="insertResult" type="button">Insert</button>
        <button id="saveDefaultTemplate" type="button">Save Default Template</button>
        <select id="templateSlot" title="Template slot"></select>
        <button id="saveTemplateSlot" type="button">Save Template</button>
      </div>
    </header>

    <section class="layout">
      <aside class="panel controls-panel">
        <div class="field">
          <label for="mode">Mode</label>
          <select id="mode">
            <option value="text">Text Banner</option>
            <option value="image">Image</option>
          </select>
        </div>

        <div class="field">
          <label for="input">Input Text</label>
          <textarea id="input" rows="5">UnicodeArtJs</textarea>
        </div>

        <div class="field" id="imageInputWrap" hidden>
          <label for="imageInput">Image File</label>
          <input id="imageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp">
          <span id="imageName" class="hint">No image selected</span>
        </div>

        <div class="grid two">
          <div class="field">
            <label for="height">Height</label>
            <input id="height" type="number" min="1" max="300">
          </div>
          <div class="field">
            <label for="width">Width</label>
            <input id="width" type="number" min="1" max="1000" placeholder="Auto">
          </div>
        </div>

        <div class="field">
          <label for="charset">Charset</label>
          <select id="charset"></select>
        </div>

        <div class="field" id="customCharsWrap">
          <label for="customChars">Custom Chars</label>
          <input id="customChars" type="text" placeholder=" .:-=+*#%@">
        </div>

        <div class="field">
          <label for="font">Visual Font</label>
          <input id="font" type="text" list="visualFontOptions">
          <datalist id="visualFontOptions"></datalist>
        </div>

        <div class="field">
          <label for="glyphFont">Glyph Font</label>
          <input id="glyphFont" type="text" list="glyphFontOptions" placeholder="Consolas, 'Courier New', monospace">
          <datalist id="glyphFontOptions"></datalist>
        </div>

        <div class="grid two">
          <div class="field">
            <label for="matrixSize">Matrix</label>
            <input id="matrixSize" type="number" min="2" max="32">
          </div>
          <div class="field">
            <label for="ratio">Ratio</label>
            <input id="ratio" type="number" min="0.1" max="10" step="0.1">
          </div>
        </div>

        <div class="grid two">
          <label class="checkbox">
            <input id="invert" type="checkbox">
            <span>Invert</span>
          </label>
          <label class="checkbox">
            <input id="trimTrailingSpaces" type="checkbox">
            <span>Trim Spaces</span>
          </label>
        </div>

        <div class="field">
          <label for="fontReduce">Font Reduce</label>
          <input id="fontReduce" type="number" min="0" max="20">
        </div>

        <section class="subpanel">
          <label class="checkbox">
            <input id="boxEnabled" type="checkbox">
            <span>Enable Box</span>
          </label>
          <div class="field">
            <label for="boxStyle">Box Style</label>
            <select id="boxStyle"></select>
          </div>
          <div class="field">
            <label for="boxTitle">Box Title</label>
            <input id="boxTitle" type="text" placeholder="Optional">
          </div>
          <label class="checkbox">
            <input id="boxShadow" type="checkbox">
            <span>Box Shadow</span>
          </label>
          <div class="grid two">
            <div class="field">
              <label for="boxPadding">Padding</label>
              <input id="boxPadding" type="number" min="0" max="20">
            </div>
            <div class="field">
              <label for="boxMargin">Margin</label>
              <input id="boxMargin" type="number" min="0" max="20">
            </div>
          </div>
        </section>

        <div class="field">
          <label for="insertMode">Insert Mode</label>
          <select id="insertMode"></select>
        </div>
      </aside>

      <section class="panel preview-panel">
        <div class="preview-toolbar">
          <div>
            <span id="statusText">Initializing...</span>
            <span id="resultMeta" class="meta"></span>
            <span id="templateStatus" class="meta"></span>
          </div>
          <progress id="progress" max="1" value="0"></progress>
        </div>
        <pre id="output" aria-live="polite"></pre>
        <div class="footer-actions">
          <button id="saveTxt" type="button">Save TXT</button>
          <button id="saveHtml" type="button">Save HTML</button>
        </div>
      </section>
    </section>
  </main>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
