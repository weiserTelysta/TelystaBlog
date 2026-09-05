import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimePath = new URL('../src/lib/articleCodeRuntime.ts', import.meta.url);

test('代码块只显示图标复制按钮，不再渲染语言标题栏', async () => {
	const source = await readFile(runtimePath, 'utf8');

	assert.doesNotMatch(source, /code-block__language|code-block__toolbar|getLanguage/);
	assert.match(source, /<svg aria-hidden="true"/);
	assert.match(source, /setAttribute\('aria-label', label\)/);
});

test('复制结果同时提供视觉状态和无障碍播报', async () => {
	const source = await readFile(runtimePath, 'utf8');

	assert.match(source, /className = 'code-block__status'/);
	assert.match(source, /setAttribute\('aria-live', 'polite'\)/);
	assert.match(source, /setCopyState\(copyButton, copyStatus, 'copied'\)/);
	assert.match(source, /setCopyState\(copyButton, copyStatus, 'error'\)/);
});
