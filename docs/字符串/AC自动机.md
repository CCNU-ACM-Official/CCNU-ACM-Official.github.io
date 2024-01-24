## AC自动机

前置芝士：$Trie$ 树，$kmp$。

### 回忆kmp

在 `kmp` 算法中，我们得到了一个 $nxt$ 数组（就是 $border$ 数组），其函数是在$s[1\sim i]$中，$nxt[i]$是最长的后缀等于前缀的长度。

由于它的性质，可以用 $nxt$ 数组来实现字符串匹配：

$nxt[i]$ 的含义也可以表示为当第 $i$ 个字符匹配失败后，下一次匹配从第 $nxt[i]$ 个字符开始。

这个算法只适用于一对一的字符串匹配，现在试图将问题扩大化：

给定一堆模式串 $T$，和一个文本串 $S$，问所有模式串在文本串中一共出现过多少次？

### 字典树构建

对于多个模式串，先给他构建字典树把它表示出来，没什么好说的。

```cpp
void insert(string s)
{
    int now=1;
    for(char ch:s)
    {
        int c=ch-'a';
        if(!son[now][c]) son[now][c]=++tot;
        now=son[now][c];
    }
    ++cnt[now];//这个节点是多少个模式串的终点
}
```

### AC自动机构建

对于多串匹配，关键点还是在于一个类似 $nxt$ 指针的构建，用来在某一个节点匹配失败后，快速找到下一个应该匹配的地方。

在字典树上沿着文本串 $S$ 前进，当遇到某个失配的位置的时候，仍然希望找到一个节点，这个节点代表了文本串现在位置的 $border$（最长后缀等于前缀）。

在多个串的时候，考虑的不仅仅是自己的 $border$。

例如 

```cpp
S=xabcab
T1=xabd
T2=abca
```

当枚举到 $S[3]$ 时，满足 $S[1,3]=T1[1,3]$。

当枚举到 $S[4]$ 时，$T1$ 失配了，但是 $T2$ 可以接上继续匹配。

我们把 $Trie$ 建立出来：

![图片.png](https://s2.loli.net/2023/11/03/Au7XNZwM2OKIVfk.png)

左边的 $b$ 后面无法匹配之后，但因为 $xab$ 已经和某个 $T$ 匹配上了，那么就表示 $S$ 中有 $ab$ 这个子串，可以直接跳到 $Trie$ 树上 $ab$ 为前缀的节点继续匹配。

那么 $xab$ 指向 $ab$ 的这个指针，就称为 $Trie$ 树上的失配指针。





![AC_automation_gif_b_3.gif](https://oi-wiki.org/string/images/ac-automaton1.gif)

用 oiwiki 这张图再来解释：

这里的 $she$ 中的 $e$ 节点指向了 $he$ 的 $e$ 节点，意思就是当 $she$ 匹配完成，下一步无法匹配之后，移动到 $he$ 中的 $e$ 那里去走下一步。

因为如果目前的文本串已经前进到了 $she$ 的位置，和模式串 $she$ 完成了匹配，与此同时，它也和模式串 $hers$ 完成了 $he$ 部分的匹配，所以下一步可以从$2$号节点继续向前走。

图中的黄色的边被称为失配指针 $fail$。

失配指针和 $kmp$ 中的 $nxt$ 在匹配上的作用是一样的。

怎么建立这一套失配指针呢

先将直接与根节点相连的这一排的失配指针直接连到根节点。然后从这一排节点开始 $bfs$：

枚举当前节点 $now$，和下一个字符 $c$：

如果节点 $now$ 本来就存在后继节点 $son[now][c]$ ，那么就可以直接往下走。

如果已知了 $now$ 的失配指针 $fail[now]$ ，那么 $son[now][c]$ 的失配指针就是 $now$ 的失配指针，再往 $c$ 方向走一步。

即 $son[fail[now]][c]$

```cpp
fail[son[now][c]]=son[fail[now]][c]
```

如果 $now$ 不存在 $c$ 出边，那么就要跳到 $now$ 的失配指针 $fail[now]$ 去，然后再往 $c$ 走。

为了方便，直接让 $now$ 的 $c$ 出边等于 $fail[now]$ 的 $c$ 出边。

```cpp
son[now][c]=son[fail[now]][c]
```

这样当失配的时候，就会自动找到失配指针指向的位置。

总体代码：

```cpp
void build()
{
    queue<int> q;
    int now=1;
    for(int c=0;c<26;++c) if(son[now][c])
    {
        fail[son[now][c]]=1;
        q.push(son[now][c]);
    }
    while(!q.empty())
    {
        int now=q.front();q.pop();
        for(int c=0;c<26;++c)
        {
            if(son[now][c])
            {
                fail[son[now][c]]=son[fail[now]][c];
                q.push(son[now][c]);//将子节点入栈
            }
            else son[now][c]=son[fail[now]][c];//向fail寻找出边。
        }
    }
}
```

在进行多模式串匹配时，假如两个模式串，它们分别是 $she$ 和 $he$。

然后此时，文本串是 $she$，那么当它到达 $Trie$ 树上的 $she$ 节点时，它同时匹配上了 $she$ 和 $he$ 两个模式串。

对于这种情况，每当到达一个节点，都要去遍历这个节点的 $fail$，看看失配节点中有没有其他模式串的结束位置。

令 $cnt[now]$ 表示 $now$ 作为多少个模式串的结束位置：

```cpp
int query(string t)
{
    int now=1,ans=0;
    for(char ch:t)
    {
        int c=ch-'a';
        now=son[now][c];
        for(int p=now;p;p=fail[p]) ans+=cnt[p];
    }
    return ans;
}
```

这样每一步都跳 $fail$，最坏情况就变成 $n^2$ 的了。

当然这是有办法避免的，我们可以将满足 $fail[now]=p$的节点，令 $cnt[now]+=cnt[p]$：

即 $cnt$ 的含义定义为 $now$ 和它所有 $fail$ 指向的节点的出现次数和。

[AC自动机二次加强](https://www.luogu.com.cn/problem/P5357)

如果是询问每个模式串在文本串中出现多少次，可以在匹配时先不跳 $fail$，每到一个节点打一个标记

在匹配完成后，用所有节点和 $fail$ 指针作为边，建立一棵树，如果 $fail[now]=p$ ，则 $p$ 指向 $now$。

每个节点的真实被访问次数，是 $fail$ 树上的子树和。

### 练习题

[P3966 [TJOI2013] 单词  ](https://www.luogu.com.cn/problem/P3966)

[P3121 [USACO15FEB] Censoring G  ](https://www.luogu.com.cn/problem/P3121)

[P3041 [USACO12JAN] Video Game G  ](https://www.luogu.com.cn/problem/P3041)

[P4052 [JSOI2007] 文本生成器  ](https://www.luogu.com.cn/problem/P4052)

[P2444 [POI2000] 病毒  ](https://www.luogu.com.cn/problem/P2444)

[P2414 [NOI2011] 阿狸的打字机  ](https://www.luogu.com.cn/problem/P2414)











