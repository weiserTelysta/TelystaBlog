import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { parseContentDate } from '../src/lib/contentDate';
import { completePostMetadata } from '../src/lib/postMetadata';
import {
	formatArticleDate,
	formatFullDate,
	formatIndexDate,
	formatPostDate,
} from '../src/lib/blogDate';

test('文章页日期使用 AP 风格的紧凑月份写法', () => {
	assert.equal(formatArticleDate(new Date('2026-01-02T12:00:00Z')), 'Jan. 2');
	assert.equal(formatArticleDate(new Date('2026-05-08T12:00:00Z')), 'May 8');
	assert.equal(formatArticleDate(new Date('2026-09-04T12:00:00Z')), 'Sept. 4');
	assert.equal(formatIndexDate(new Date('2026-09-04T12:00:00Z')), 'Sept. 4, 2026');
});

test('紧凑展示不改变完整日期和机器可读日期', () => {
	const date = new Date('2026-09-04T12:00:00Z');

	assert.equal(formatPostDate(date), 'September 4, 2026');
	assert.equal(formatFullDate(date), '2026-09-04');
});

test('日期校验拒绝不存在的日期，保留闰日和旧的不补零写法', () => {
	for (const invalid of ['2026-02-30', ' 2026-02-30 ', '2026-2-29', '2026-04-31', '2026-13-01', '2026-02-30T12:00:00Z', null, true, '']) {
		assert.equal(parseContentDate(invalid), undefined, String(invalid));
	}
	assert.equal(parseContentDate('2024-2-29')?.toISOString(), '2024-02-29T00:00:00.000Z');
	const data = completePostMetadata({ publishedAt: '2026-9-1' }, '# 日期\n', 'notes/date.md');
	assert.equal(data.publishedAt, '2026-09-01');
	assert.equal(data.updatedAt, '2026-09-01');
});

test('不同系统时区生成相同的月初日期、年份与机器日期', () => {
	for (const timezone of ['UTC', 'Asia/Shanghai', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
		const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
			`import {parseContentDate} from './src/lib/contentDate.ts';
			import {formatPostDate,formatFullDate} from './src/lib/blogDate.ts';
			for (const value of ['2026-9-1', '2026-01-01']) {
			 const date=parseContentDate(value); console.log(formatPostDate(date),formatFullDate(date));
			}`], { cwd: process.cwd(), env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
		assert.equal(output, 'September 1, 2026 2026-09-01\nJanuary 1, 2026 2026-01-01\n', timezone);
	}
});
