---
title: C++
titleTemplate: 语法入门
---

### 头文件

万能头文件

```cpp
#include<bits/stdc++.h>
using namespace std
```

其中using namespace std可以类似地看作是一个C++的头文件，有了这个头文件就可以使用C++中的一些函数。

### 输入输出

C语言：

```cpp
int x,y;
scanf("%d%d",&x,&y),printf("%d%d",x,y);
```

C++：

```cpp
int x,y;
cin>>x>>y,cout<<x<<y<<endl;
```

更方便，不用考虑格式

效率问题：一般情况下cin更慢，因为cin为了和scanf同步设置了一个缓冲区，保 证cin可以和scanf混用。

可以手动解除这个缓冲区绑定：

加入代码：

```cpp
ios::sync_with_stdio(0);
cin.tie(0),cout.tie(0);
```

就可以让cin和scanf一样快，但是注意不能cin，cout和scanf、printf、putchar、puts等混合使用。

### 缓冲区

```
cout<<endl;
```

数据的输出方式是，程序将要输出的数字放在缓冲区，然后再找时机把缓冲区里的内容输出。

这样的换行方式每次都会清空缓冲区，费时比较多

```
cout<<'\n';
```

而这样就会单纯的换行，不会输出缓冲区。

就是在遇到endl之前，代码所有应该有的输出都不会有显示，直到程序运行结束。

一般为了不超时，都会用'\n'替换endl。

### 判断

与C语言一致

```cpp
if(x>0){}
else{}
```

### 循环

与C语言一致

```cpp
int n=100;
int a[101];
for(int i=1;i<=n;++i)//循环100次
{
	cin>>a[i];
}
```

### 数组

下标必须是常量，请不要用变量定义数组大小

正确的：a[1001]；

错误的：a[n+1]；

在主函数内部定义数组，数组默认值随机。

在主函数外面定义数组，数组默认值为零。

### 结构体

有时候想要将几个元素作为一个整体，比如交换两个学生的信息，不能只交换名字或者学号，要一起交换

这样定义：

```cpp
struct student//struct + 结构体名字(类型名字)
{
    string name;
    int id;
}a,b;
cin>>a.name>>a.id;
cin>>b.name>>b.id;
swap(a,b);
```

### 特殊的变量类型

字符串类型：string

浮点数类型：double（不必去用float，float的表示范围太小）

### 练习题

[P1001 A+B Problem  ](https://www.luogu.com.cn/problem/P1001)

[P5705 【深基2.例7】数字反转  ](https://www.luogu.com.cn/problem/P5705)

[P5715 【深基3.例8】三位数排序  ](https://www.luogu.com.cn/problem/P5715)

[P1046 [NOIP2005 普及组] 陶陶摘苹果  ](https://www.luogu.com.cn/problem/P1046)

[P1047 [NOIP2005 普及组] 校门外的树  ](https://www.luogu.com.cn/problem/P1047)

[P5731 【深基5.习6】蛇形方阵  ](https://www.luogu.com.cn/problem/P5731)