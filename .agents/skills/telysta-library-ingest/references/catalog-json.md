# 按中图法维护 JSON

一级文件名表示基本大类，如 `K.json` 为历史、地理；文件内的 `booklists` 按核实的细分类号分组。网站分类页再进入Booklist，因此导航有两层，实际类号可以细到多位。基本大类名称见 `_classes.json`，现有细类映射见 [clc.md](clc.md)。

```json
{
  "category": "K",
  "booklists": [
    {
      "clcCode": "K27",
      "clcName": "中华人民共和国史",
      "books": [
        {
          "id": "WEISER012345abcdef",
          "title": "书名示例",
          "authors": ["作者"],
          "access": "public",
          "description": "简短介绍。",
          "files": [],
          "draft": true
        }
      ]
    }
  ]
}
```

示例为草稿；正式发布需填写经验证的文件URL。`books` 内一般省略 `clcCode`／`clcName`，由所属分组继承。历史类名别名可以逐书保留 `clcName`，不能用逐书类号覆盖所属分组。更换分类时移动JSON条目到正确书单，固定ID、文件URL和R2对象key保持不变。

同一类号只维护一个Booklist，新书并入现有 `books`。首次出现的细类需先核对分类依据，再增加分组和更新 `clc.md`；没有对应书籍的大类无需创建空文件。不要为每本书创建一个JSON文件或逐书import。所有分类JSON自动加载，重复ID会阻止构建。

`access: public` 是匿名可见，`protected` 是需密码验证。受保护完整资料放 `.library-private/catalog/<大类>.json`，沿用相同分组结构；公开JSON仅保留工具生成的通用占位。状态变更使用 `library:access`，详见 [access-control.md](access-control.md)。`draft`、分类和访问状态是三个独立维度。

改动后运行 `npm run content:check` 和适用检查。JSON更新进入Git；新文件与封面进入R2；完整受保护书目和Secret不进入公开Git。更新Worker catalog并独立部署后，文件访问名单才会变化。
