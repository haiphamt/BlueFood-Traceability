import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const {
  Document,
  Page,
  Text: PdfText,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} = require('@react-pdf/renderer');

const TARGET_STRINGS = [
  'Lịch trình chuỗi cung ứng',
  'Cục Bảo vệ thực vật',
  'Chứng nhận chất lượng',
  'Đảm bảo truy xuất nguồn gốc thực phẩm',
];

const TEXT_GLYPH_BUFFER = 2;
const RENDER_ONLY_TRAILING_SPACE = '\u00A0';

function appendRenderOnlySpace(children) {
  if (typeof children === 'string') {
    return children.endsWith(RENDER_ONLY_TRAILING_SPACE)
      ? children
      : `${children}${RENDER_ONLY_TRAILING_SPACE}`;
  }
  if (Array.isArray(children)) {
    return children.map(appendRenderOnlySpace);
  }
  return children;
}

function SafePdfText({ children, ...props }) {
  return React.createElement(PdfText, props, appendRenderOnlySpace(children));
}

function findFontFile(fileName) {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', fileName),
    path.join(process.cwd(), 'apps', 'web', 'public', 'fonts', fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const font400 = findFontFile('NotoSans-400.ttf');
const font700 = findFontFile('NotoSans-700.ttf');

assert(font400, 'Missing public/fonts/NotoSans-400.ttf');
assert(font700, 'Missing public/fonts/NotoSans-700.ttf');

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: font400, fontWeight: 400 },
    { src: font700, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'NotoSans',
    fontSize: 9,
    color: '#121c28',
  },
  sectionHeader: {
    width: 230,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#286b3f',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: 700,
    lineHeight: 1.25,
    paddingRight: TEXT_GLYPH_BUFFER + 1,
    color: '#1a3c2e',
  },
  sectionCount: {
    flexShrink: 0,
    fontSize: 8,
    lineHeight: 1.25,
    paddingRight: TEXT_GLYPH_BUFFER,
    color: '#727973',
  },
  certCard: {
    width: 152,
    borderWidth: 1,
    borderColor: '#e4ece5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  certType: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.25,
    paddingRight: TEXT_GLYPH_BUFFER,
  },
  certIssuer: {
    fontSize: 7.5,
    lineHeight: 1.25,
    paddingRight: TEXT_GLYPH_BUFFER + 1,
    color: '#424843',
  },
  body: {
    marginTop: 10,
    fontSize: 9,
    lineHeight: 1.25,
    paddingRight: TEXT_GLYPH_BUFFER,
  },
});

const doc = React.createElement(
  Document,
  { title: 'Vietnamese PDF text regression' },
  React.createElement(
    Page,
    { size: 'A4', style: styles.page },
    React.createElement(
      View,
      { style: styles.sectionHeader },
      React.createElement(View, { style: styles.sectionBar }),
      React.createElement(SafePdfText, { style: styles.sectionTitle }, TARGET_STRINGS[0]),
      React.createElement(SafePdfText, { style: styles.sectionCount }, '(12 sự kiện)'),
    ),
    React.createElement(
      View,
      { style: styles.certCard },
      React.createElement(SafePdfText, { style: styles.certType }, TARGET_STRINGS[2]),
      React.createElement(SafePdfText, { style: styles.certIssuer }, TARGET_STRINGS[1]),
    ),
    React.createElement(SafePdfText, { style: styles.body }, TARGET_STRINGS[3]),
  ),
);

const buffer = await renderToBuffer(doc);
const pdfText = Buffer.from(buffer).toString('latin1');
const guardedTarget = appendRenderOnlySpace(TARGET_STRINGS[0]);

assert(buffer.length > 3000, `Generated PDF is unexpectedly small (${buffer.length} bytes)`);
assert(pdfText.includes('NotoSans'), 'Generated PDF did not embed NotoSans');
assert(!pdfText.includes('/BaseFont /Helvetica'), 'Generated PDF fell back to Helvetica');
assert(guardedTarget === `${TARGET_STRINGS[0]}${RENDER_ONLY_TRAILING_SPACE}`, 'SafePdfText did not append a render-only NBSP');
assert(TARGET_STRINGS[0] === 'Lịch trình chuỗi cung ứng', 'TARGET_STRINGS must keep the source text unchanged');

if (process.argv.includes('--write')) {
  const outputDir = path.join(process.cwd(), 'test-output');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'vietnamese-pdf-regression.pdf'), buffer);
}

console.log(
  `Vietnamese PDF renderer guard check passed (${buffer.length} bytes, NotoSans embedded, render-only trailing space applied).`,
);
