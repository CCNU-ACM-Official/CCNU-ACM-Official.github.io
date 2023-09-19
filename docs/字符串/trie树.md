---
title: trie树
titleTemplate: 字符串
---

### trie

如果我们想查询一个字符串是否在一个字符串集合中出现过怎么办呢？~~当然是用map~~

如果一个一个去比较，就算用$hash$也要用$O(n)$的时间。

想一想我们如果要在教务系统上查一个人：

比如我们要找小红，那么我们先根据他的学校武汉理工大学去筛选，把非武汉理工大学的人都筛掉。

然后再找他属于的学院成人教育学院，把非计算机学院的人都筛掉……

层层筛选，直到你手里关于他的信息每一条都符合，就算找到了。

字符串也可以这样匹配：

我们要在一个集合里面找$abcde$这个字符串是否出现过，先找有没有首字符为$a$的，然后在首字符为$a$的里面找第二个字符为$b$的……

所以我们现在的要求就是把集合里的字符串按上述情况分类。

这种结构很像树形结构

比如我们把一下字符集合插入一棵树中：

$aa$、$aba$、$ba$、$caaa$、$cab$、$cba$、$cc$



![trie1](https://oi-wiki.org/string/images/trie1.png)

然后就可以用来检索字符串了。

```cpp
int tot=0;
void insert(string s)
{
	int now=0;
	for(char ch:s)
	{
		int c=ch-'a';
		if(trie[now][c]==0) trie[now][c]=++tot;
		now=trie[now][c];
	}
	cnt[now]++;//记录有一个字符串以这里为结尾。
}
```



### 01trie

这种结构不仅用来存放字符串，还可以用来维护二进制数字来辅助位运算。

比如，我们给定一个数字集合，然后给定一个整数$x$，求$x$和数字集合里的某一个数的异或和最大是多少。

我们把集合里的数字都以二进制的形式存在$trie$树里，这个树每个节点只有两个分支，表示数字下一位是$0/1$，所以也叫$01trie$。

```cpp
int tot=0;
void insert(int x,int k,int &p)//数字是x,k表示当前是二进制的第几位，p表示当前节点编号
{
    if(!p) p=++tot;//如果还没有来过这里，则新建一个节点。（动态开点）
    //k初始一般取30，满足2^k>max(x)就可以了
    if(k<0) return;
    int b=(x>>k)&1;
    insert(x,k-1,son[x][b]);
}
```

当查询的时候，优先去找和自己当前位不同的分支，以满足高位异或得到$1$

```cpp
int query(int x,int k,int p)
{
	if(!p) return;
	if(k<0) return;
    int b=(x>>k)&1;
    if(son[p][b^1]) return query(x,k-1,son[p][b^1])+(1<<k);//走不同的分治可以保证这一位异或得到1
    return query(x,k-1,son[p][b]);
}
```



















