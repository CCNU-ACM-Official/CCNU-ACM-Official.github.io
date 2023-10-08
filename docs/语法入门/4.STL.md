---
title: STL
titleTemplate: 语法入门
---

### STL

$STL$种类较多，不用一次全部背下来，先记住有哪些东西，用的时候再查阅具体资料，多用几次就记住了。

#### 排序

```cpp
sort(a+l,a+r+1,cmp);
```

将数组$a[l]\sim a[r]$按$cmp$规则排序（不写默认从小到大）

#### 去重

```cpp
int pos=unique(a+l,a+r+1)-a;
```

把数组$a[l]\sim a[r]$中的重复元素去掉，注意$a[l]\sim a[r]
$必须是提前从小到大排好序的，它会把每个元素的第一份从小到大放在$a[l]\sim a[pos-1]$的位置上，把重复的元素放在$a[pos]\sim
a[r]$的位置上。

比如$1\ 2\ 2\ 5\ 5$会变成$1\ 2\ 5\ 2\ 5$，其中$pos=4$

#### 二分查找

```cpp
int p1=lower_bound(a+l,a+r+1,x)-a;//数组a[l]~a[r]中第一个大于等于x位置的下标
int p2=upper_bound(a+l,a+r+1,x)-a;//数组a[l]~a[r]中第一个大于x位置的下标
```

#### 全排列

```cpp
do
{
	
}next_permutation(a+1,a+n+1);//将数组a生成字典序上的下一个数组，如果字典序已经最大了结束
```

#### 翻转

```cpp
reverse(a+1,a+n+1);//翻转数组a[1]~a[n]
```

#### vector

```cpp
vector<int> a(n+1);
```

其中&lt;int&gt;是类型，可以替换，a是数组名称，$(n+1)$是数组大小，正常情况下数组不能动态定义大小，使用动态数组可以。

vector是支持下标访问的有序容器。

动态数组的定义可以嵌套：

```cpp
vector<vector<int> > a(n+1);//开了n+1个动态数组
vector<vector<int> > a(n+1,vector<int>(n+1));//开了n+1个n+1大小的动态数组
vector a(n+1,vector<int>(n+1));//c++17 开始支持自动类型推导
```

加入一个元素：

```cpp
a.emplace_back(x);//向a数组末尾加入元素x
```

注意，如果你定义的时候比如规定了vector&lt;int&gt; a(5)，那么再emplace_back()，是把元素加到了$a[5]$的位置上，因为$a[0]\sim
a[4]$已经存在了。

删除末尾元素：

```cpp
a.pop_back();
```

删除一段元素：

```cpp
a.erase(a.begin()+l,a.begin()+r+1);//删除a[l]~a[r]
```

重新定义动态数组大小：

```cpp
a.resize(100,0);
```

按顺序遍历数组元素：

```cpp
for(int x:a){}
```

迭代器：专门用来指向$stl$工具地址的一种指针类似物。

```cpp
a.begin();//动态数组a中第一个元素的迭代器
a.end();//动态数组a中最后一个元素之后一个位置的迭代器。
vector<int>::iterator it=a.begin();//通过这种方式可以定义一个名字叫it的迭代器变量。
for(auto it=a.begin();it!=a.end();++it){};//迭代器可以通过自增运算改变数值，在多数STL中，内部元素的迭代器地址都是逻辑上连续的。(auto关键字可以自动定义一个迭代器类型)。
```

注意，不同类型的$STL$迭代器类型是不同的，比如vector&lt;int&gt;的迭代器不能去指向一个set内部的元素。​

以下函数是本节将要介绍的不同类型$STL$都可以调用的函数：

```cpp
=://构造赋值
a.begin();//指向a开头元素的迭代器
a.end();//指向a最后一个元素之后一个位置的迭代器
a.size();//返回容器a中元素个数
a.empty();//检查容器a是否为空，为空则返回值为1
a.swap(b);//交换a,b两个容器的内容，这样交换是O(1)的。(它实际没交换，换了以下两个容器的内部指针)
a.clear();//清空a里的元素
a.erase(元素/迭代器);//对于顺序容器，这个操作要O(n)，对于无序容器要O(logn)
```

各种比较符号比较两个同类型容器大小时，默认按字典序排序。

对于vector的排序，用以下方式实现：

```cpp
sort(a.begin(),a.end());//整个a数组排序
sort(a.begin()+l,a.begin()r+1+);//a[l]~a[r]排序
```

其他函数类似。

#### set

集合，无序容器。

```cpp
set<int> q;
q.insert(5);//集合中插入数字
```

放入集合中的数字将会被自动**去重**并从小到大排序，但是集合不能用下标进行访问，只能用迭代器。（因为它内部是数据结构）。

```cpp
cout<<q.count(x)<<endl;//集合内元素x的数量
```

查找元素$x$的迭代器：

```cpp
auto it=q.find(x);//如果找不到，返回q.end();
```

输出集合中最小的数字和最大的数字：

```cpp
cout<<(*q.begin())<<' '<<(*prev(q.end()))<<endl;
auto it1=q.begin(),it2=prev(q.end());
cout<<(*it1)<<' '<<(*it2)endl;
```

按从小到大的顺序输出$set$中所有元素：

```cpp
set<int> q;
set<int>::iterator it;
while(it!=q.end())
{
    cout<<(*it)<<'\n';
    ++it;
}
```

因为$set$是无序容器，所以不能直接用上面有序函数，比如lower_bound()之类的，要这么写：

```cpp
set<int> q;
int num=q.lower_bound(x);//返回q中第一个大于等于x的数字，找不到返回q.end()
```

#### multiset

跟set的区别是，不会删除重复的元素。

用multiset时要注意，如果使用

```cpp
q.erase(x);
```

是删除所有值为x的元素，不管有多少个都删了，如果只想删除一个，要用迭代器

```cpp
auto it=q.find(x);
q.erase(it);
```

#### map

map是一个任意下标类型的数字。

通常数组下标只能是整数，map可以支持多种下标

```cpp
map<类型1，类型2> q;
q[类型1]=类型2;
```

例如：

```cpp
map<char,int> q;
q['a']=10;
```

遍历map

```cpp
map<char,int> q;
for(pair<char,int> x:q)
{
    cout<<x.first<<' '<<x.second<<'\n';
}
```

其中x.first是指类型1（下标），x.second是存的类型2（内容）

pair是一个二元组，pair&lt;类型1，类型2&gt;把两个类型封装成一个变量，第一个通过.first调用，第二个通过.second调用。

#### 离散化

所谓离散化，就是把数组在**大小关系**不变的情况下，将数字重新赋值

比如$[1,100,10,998]$离散化后变成$[1,3,2,4]$。

这样就可以将数字规模变成数字个数的数量级，从而降低某些算法的时间复杂度

怎么离散化呢？

用vector&lt;int&gt;有很方便的连招

```cpp
vector<int> a(n+1),c;
for(int i=1;i<=n;++i)
{
    cin>>a[i];
    c.emplace_back(a[i]);//放入vector
}
sort(c.begin(),c.end());//排序
c.erase(unique(c.begin(),c.end()),c.end());//去重并把重复的部分删掉
for(int i=1;i<=n;++i)
{
    a[i]=lower_bound(c.begin(),c.end(),a[i])-c.begin()+1;//二分找到a[i]在c中的位置。
}
```

#### bitset

这次不讲，以后再更，感兴趣自己看。

### 位运算

电脑中的器件都是基于二进制的，所以会产生一系列和二进制有关的运算

与（两个都是1结果才为1）、或（只要有一个是1结果就是1）、异或（两个不同结果才是1），取反：

$$0\ and\ 0 = 0\ \ 0\ or\ 0 = 0\ \ \ 0\ xor\ 0=0\\$$
$$0\ and\ 1 = 0\ \ 0\ or\ 1 = 1\ \ \ 0\ xor\ 1=1\\$$
$$1\ and\ 0 = 0\ \ 1\ or\ 0 = 1\ \ \ 1\ xor\ 0=1\\$$
$$1\ and\ 1 = 1\ \ 1\ or\ 1 = 1\ \ \ 1\ xor\ 1=0\\$$
$$!0=1,\ \ !1=0$$

and 对应 &，or 对应 |，xor 对应 ^。

按位与：$0011\ and\ 0101=0001$

按位或：$0011\ or\ 0101=0111$

按位异或：$0011\ xor\ 0101=0110$

按位取反：$\sim 0011=1100$

左右移：

```cpp
(x<<y);//左移，等价于x乘以2的y次方。
(x>>y);//右移，等价于x除以2的y次方下取整。
```

运算符号优先级：不加括号等死吧。

判断某个数字哪些位置上是$1$：

```cpp
for(int k=0;k<=30;++k) 
{
    if((x>>k)&1);//判断x的第k位是不是1
    x|=(1<<k);//将第k位设置成1
    x&=~(1<<k);//将第k位设置成0
}
```

### 练习题

[P1996 约瑟夫问题  ](https://www.luogu.com.cn/problem/P1996)

[P2580 于是他错误的点名开始了  ](https://www.luogu.com.cn/problem/P2580)

[P1100 高低位交换  ](https://www.luogu.com.cn/problem/P1100)

[Bus of Characters  ](https://www.luogu.com.cn/problem/CF982B)

[Do Not Be Distracted!  ](https://www.luogu.com.cn/problem/CF1520A)









