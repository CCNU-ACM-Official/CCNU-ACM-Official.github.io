---
title: 语法入门
titleTemplate: 语法入门
---

# 使用`winget`安装编译器

本章介绍使用软件包管理器`winget`安装编译器。以下内容建议在`Windows 10`以及更新的系统上运行。以下内容不能在Mac或Linux下运行。

## 安装`Winlibs`与`VSCode`

右键单击你的`Windows`徽标，选择打开“终端”。

粘贴下面的命令并按回车：

```powershell
winget install BrechtSanders.WinLibs.POSIX.UCRT
winget install Microsoft.VisualStudioCode
```

当提示你同意用户协议时，**输入字母`y`并回车**。

安装过程较慢，请静候安装程序结束。

---

现在你的设备上已经完成了`g++`编译环境的配置。

为了方便，你可以按照接下来的内容配置VSCode。

## 配置VSCode

1. 打开`Visual Studio Code`
2. 打开左侧扩展选项卡（或者按`Ctrl+Shift+X`）
3. 搜索三个插件“简体中文语言包”，“`C/C++`”，“`Code Runner`”并点击安装
4. 按 `Ctrl+,` 进入设置
5. 设置`Auto Save`为`afterDelay`;设置`Run in Terminal`为打开

现在打开一个你用来放C++源代码的文件夹。

配置结束，你可以愉快的新建cpp文件写代码了。

