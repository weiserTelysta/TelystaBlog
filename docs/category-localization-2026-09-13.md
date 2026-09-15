# 2026-09-13 分类题签与 letters 修正

## 原因与结果

最初将收起和展开两种文案统一为中文，误解了角色展示窗口的用途。经作者澄清，最终保留两种状态的区别：收起时使用原来的花体角色名与英文分类题签（例如 `Weiser / Manuscript`、`Telysta / Collection`），展开后使用中文栏目标题与介绍。入口恢复 `Category / All Records`，系列入口保持 `Series / All Series`；`Category Map`、`records`、`Current` 也恢复原英文。文章列表的分类小标签仍显示英文 ID。

选中分类后的入口也使用完整英文所属名称：`Weiser's Manuscript`、`Telysta's Collection`、`Rhaelysa's Letters`、`Alice's Reading`、`Sylvaena's Life`、`Rhaelysa's Portrait`、`Weiser's Notes`。名称由角色名与英文题签派生，不再读取中文标题，也不只显示 `Manuscript` 等短名。返回总览后恢复 `All Records`。

正式分类是 `letters`，此前将其映射到 `essays` 的处理有误。配置、自动元数据和文章创建测试已同步修正。按作者要求，直接移除 `essays`，不保留别名或旧地址跳转。旧分类地址将不再生成；Lamy 文章本身的路径不变。

## 实现边界

- 视觉配置保留 `cardInscription`，专门维护角色名和英文题签；只删除未使用的 `shortTitle`。
- 恢复原有花体字体、字号、字距、颜色和移动端规则。角色身份与中文栏目名称分别维护，不能当成重复数据删除。
- 保留卡片尺寸、图片、展开方式、滚动、键盘焦点及减弱动态效果处理。
- 更新文章写作指南，并在历史构建修复记录中标明已撤销的分类决定。
- 后台管理系统仅进行可行性调查，见 [本地管理系统研判](local-admin-assessment-2026-09-13.md)，本次没有实现后台或安装 CMS。

## 验证

`npm run check` 通过：类型检查零错误、零警告，85 项测试通过，82 个文档内容检查通过，26 个页面静态构建成功。

`npx playwright test tests/browser/navigation.spec.ts` 的 8 项检查全部通过：390px 与 1440px 英文角色题签、中文展开介绍、键盘跳转及焦点返回；全部七个分类页的英文所属名称和返回总览；320–1440px 入口对齐和页面无横向溢出；既有资源看图器回归。移动端覆盖减弱动态效果，桌面覆盖普通动效，并已检查截图。

内容回归覆盖 `letters` 目录自动分类、显式分类与拒绝 `essays`。已确认产物存在 `blog/category/letters/index.html`，不存在 `blog/category/essays/index.html`。此次为本地验证，尚未提交、推送或触发线上部署。
