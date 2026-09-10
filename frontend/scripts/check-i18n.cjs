// Static guard: UI text belongs in resources, while protocol values remain stable.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const failures = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.tsx') || file.includes('.test.')) continue;
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      const text = ts.isJsxText(node) ? node.text.trim() :
        ts.isJsxAttribute(node) && ['title', 'placeholder', 'aria-label', 'alt', 'heading', 'exp'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer) ? node.initializer.text : '';
      if (/\p{L}/u.test(text)) failures.push(`${path.relative(root, file)}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1} ${text}`);
      if (ts.isJsxExpression(node) && node.expression && (!ts.isJsxAttribute(node.parent) || ['title', 'placeholder', 'aria-label', 'alt', 'heading', 'exp'].includes(node.parent.name.text))) {
        const expression = node.expression;
        const literal = ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) ? expression.text :
          ts.isTemplateExpression(expression) ? expression.head.text + expression.templateSpans.map(span => span.literal.text).join('') : '';
        if (/\p{L}/u.test(literal)) failures.push(`${path.relative(root, file)}:${ast.getLineAndCharacterOfPosition(node.pos).line + 1} ${literal}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
walk(root);
for (const file of fs.readdirSync(path.join(root, 'i18n/en'))) {
  const en = JSON.parse(fs.readFileSync(path.join(root, 'i18n/en', file), 'utf8'));
  const hi = JSON.parse(fs.readFileSync(path.join(root, 'i18n/hi', file), 'utf8'));
  for (const key of Object.keys(en)) if (!hi[key]) failures.push(`${file}:${key}: missing Hindi translation`);
}
if (failures.length) { process.stderr.write(failures.join('\n') + '\n'); process.exitCode = 1; }
else process.stdout.write('Translation coverage and JSX text audit passed.\n');
