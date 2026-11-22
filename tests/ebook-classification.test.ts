import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ebookClassificationIssue, parseLibraryClassificationRegistry, type LibraryClassificationRegistry } from '../src/lib/ebooks/classification';

const registry: LibraryClassificationRegistry = { version: 1, classes: {
	H711: { name: '古印度语', verification: 'reference-checked', sources: ['https://lib.gdupt.edu.cn/xszl/zhongtufa/h.html'] },
	K27: { name: '中华人民共和国史', aliases: ['中华人民共和国历史'], verification: 'legacy-label', sources: [] },
} };

test('拒绝类号与名称混用，并保留明确登记的历史别名', () => {
	assert.match(ebookClassificationIssue({ clcCode: 'H711', clcName: '印度语族' }, registry)!, /古印度语/);
	assert.equal(ebookClassificationIssue({ clcCode: 'K27', clcName: '中华人民共和国历史' }, registry), undefined);
});
test('新类必须先有登记依据，不能用继承属性绕过校验', () => {
	assert.match(ebookClassificationIssue({ clcCode: 'H712', clcName: '印地语' }, registry)!, /分类依据/);
	assert.match(ebookClassificationIssue({ clcCode: '__proto__', clcName: 'anything' }, registry)!, /分类依据/);
});
test('分类校验适用于受保护占位，且不依赖或修改对象地址', () => {
	const book = { clcCode: 'K27', clcName: '中华人民共和国史', privateStub: true, files: [] };
	assert.equal(ebookClassificationIssue(book, registry), undefined);
	assert.deepEqual(book.files, []);
	assert.match(ebookClassificationIssue({}, registry)!, /缺少/);
});

test('已核对分类必须有来源；历史映射仍可明确保留待复核状态', () => {
	assert.equal(parseLibraryClassificationRegistry(registry), registry);
	assert.throws(() => parseLibraryClassificationRegistry({ version: 1, classes: {
		H711: { name: '古印度语', verification: 'reference-checked', sources: [] },
	} }), /来源不完整/);
	assert.throws(() => parseLibraryClassificationRegistry({ version: 1, classes: [] }), /classes/);
	assert.throws(() => parseLibraryClassificationRegistry({ version: 1, classes: {
		H711: { ...registry.classes.H711, aliases: '印度语族' },
	} }), /别名/);
});
