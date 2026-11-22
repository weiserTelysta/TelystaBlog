import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentReturnTo } from '../client/returnTo.js';
test('讨论登录只返回固定站内内容，拒绝开放重定向和脚本',()=>{
 for(const value of ['/ebooks/WEISER012345abcdef/#discussion','/blog/WEISER012345abcdef/#discussion'])assert.equal(commentReturnTo(value),value);
 for(const value of [null,'','//evil.example','https://evil.example','javascript:alert(1)','/console/','/ebooks/../console/','/ebooks/WEISER012345abcdef/?token=secret#discussion','/blog/WEISER012345abcdef/#discussion\n'])assert.equal(commentReturnTo(value),null);
});
