## KMP

### 字符串匹配

给两个字符串 $s,t$ ，问字符串 $t$ 在 $s$ 中出现了多少次？

例如：

```cpp
s = ababacabaca
t = abaca
```

则一共出现了两次，分别是 $s$ 中的第 $3$ 和第 $7$ 个位置开始匹配（从 $1$ 开始算）。

暴力法字符串匹配，一般是 $O(nm)$ 的：

```cpp
string s,t;
cin>>s>>t;
int sum=0;
int n=s.length(),m=t.length();
s=" "+s,t=" "+t;
for(int i=1;i<=n-m;++i)
{
    bool flag=1;
    for(int j=1;j<=m;++j)
    {
        if(s[i+j]!=t[j])
        {
            flag=0;break;
        }
    }
    if(flag) ++sum;
}
```

来实现一下模拟过程：

当 $i=1$ 时

```cpp
ababacabaca  ababacabaca  ababacabaca  
abaca        abaca		  abaca
↑             ↑				↑
```

$t[1]=s[1]$，$t[2]=s[2]$，$t[3]=s[3]$。

我们匹配上了三个，然后后面失配了。

当 $i=2$ 时

```cpp
ababacabaca
 abaca
 ↑
```

一个都没匹配上

当 $i=3$ 时：

```cpp
ababacabaca
  abaca
  ↑
```

这里匹配的时候，注意到一个信息，在之前的匹配中，我们知道 $t[3]=s[3]$。

而且我们还知道 $t[1]=t[3]$ ，所以第一个位置是一定会匹配上的。

这样可以还不够明显，我们换一个例子：

```cpp
s=abcxabcxabcy
t=abcxabcy
```

开始匹配：

```cpp
abcxabcxabcy abcxabcxabcy abcxabcxabcy
abcxabcy	 abcxabcy	  abcxabcy	
↑		      ↑			    ……  ↑
```

匹配到上述位置

满足 $t[1\sim 7] = s[1\sim 7]$

```cpp
abcxabcyabc abcxabcyabc abcxabcyabc 
 abcyabc	  abcyabc      abcyabc
 ↑			  ↑			   ↑
```

这三次都是直接失败

```
abcxabcxabcy
	abcyabc	
```

当匹配到这里的时候，我们知道刚才在第一次的时候满足 $t[5\sim 7]=s[5\sim 7]$。

而且 $t$ 字符串满足 $t[1\sim 3] = t[5\sim 7]$。

那么说明 $t[1\sim 3]=s[5\sim 7]$。

也就是说，这次匹配接着去比较 $t[4]$ 和 $s[8]$ 就可以了，一下子跳过很多（为什么中间部分不用再匹配，看下图）。

总结一下：

如果当前 $s[l\sim r]$ 和 $t[1\sim p]$ 匹配上了，且存在一个长度 $len$ 满足 $t[1\sim len]=t[p-len+1,p]$

那么，当以 $s[r-len+1]$ 作为开头匹配的时候，可以直接认为前 $len$ 个字符匹配上了。

这里 $len$ 可以认为是一个后缀和一个前缀相等的长度（而且是最长的），这种结构简称 $border$ 。

```
abcxabcxabcy  abcxabcxabcy
abcxabcy	      abcxabcy
↑↑↑ ↑↑↑			  ↑↑↑
```



![图片.png](https://s2.loli.net/2023/11/03/JxLQrMCOgNEwfSn.png)



上图中，红色串是 $s$ ，绿色串是 $t$ ，蓝色是匹配上的部分，紫色是最长 $border$。

同时可以证明，这中间的位置$s[l+1]\sim s[r-len]$ 没有必要作为匹配的开头位置（橙色部分）。

![图片.png](https://s2.loli.net/2023/11/03/aNpdtJnx8se6Wbh.png)

如果存在 $pt\in[l+1, r-len]$，以 $pt$ 为匹配开头位置，那么在$s[pt]\sim s[r]$ 就要去匹配 $t[1]\sim t[r-pt+1]$。（$pt$ 为橙色圆圈位置）

![图片.png](https://s2.loli.net/2023/11/03/x3mqnYlWhEviKkS.png)

橙色部分原本是匹配 $T$ 的后半段的，现在要去匹配 $T$ 的前半段。

如果能匹配上，那么橙色部分必然是一个 $border$（可惜它不是，这与紫色是最长 $border$ 的定义相违背）。

所以橙色圆圈位置是不可能作为起点的。

那么当匹配失败后，可以直接跳到最长 $border$ 位置然后进行下一次匹配：

![图片.png](https://s2.loli.net/2023/11/03/6dysnev2PxDHZpI.png)



即：

```cpp
abcxabcxabcy  abcxabcxabcy
abcxabcy	      abcxabcy
↑↑↑ ↑↑↑			  ↑↑↑
```

综上：每次匹配失败后，跳转到当前匹配到的前缀的 $border$ 位置。

那么问题的关键就是，怎么求出 $T$ 串的每个前缀的最长 $border$

有一个性质，$border$ 具有传递性：

比如 $1\sim n$ 的 $border$ 的长度是 $m$ ，即 $t[1\sim m]=t[n-m+1\sim n]$。

然后 $1\sim m$ 的 $border$ 的长度是 $k$ ，即 $t[1\sim k]=t[m-k+1,k]$。

那么长度 $k$ 也是 $t[1\sim n]$ 的一个 $border$ 。

![图片.png](https://s2.loli.net/2023/11/03/diYkj1UtOowm78K.png)

如图，$k$ 作为 $m$ 的$border$ ，那么也满足 $t[1\sim k]=t[n-k+1\sim n]$ 。

由此得出一个基于递推的求前缀 $border$ 的方法：

设 $t[1\sim i]$ 的最长 $border$ 记作 $border[i]$。

一开始令 $len=border[i]$

如果 $t[len+1]=t[i+1]$ ，那么 $t[1\sim i+1]$ 的最长 $border$ 的长度是 $len+1$。

如果匹配失败，那么说明从 $len$ 无法得到 $i+1$ 位置的 $border$ 了。

但是 $border$ 具有传递性，所以直接令 $len=border[len]$，然后继续匹配下一个位置。

这部分的时间复杂度分析：每次向后匹配一位的时间复杂度是 $O(1)$。

因为每次跳 $border$ 都会让 $border$ 的长度减少，而每一次成功匹配只会让 $border$ 增加 $1$ ，所以跳 $border$ 的总次数是 $O(n)$ 的。

注意是跳 $border$ 的**总次数**是 $O(n)$ ，可能某一步跳很多次，然后其他步不跳。

```cpp
string s,t;
cin>>s>>t;
int n=s.length(),m=t.length();
s=" "+s;
t=" "+t;
vector<int> nxt(m+1);
int j=0;
for(int i=2;i<=m;++i)
{
	while(j>0&&t[i]!=t[j+1]) j=nxt[j];
	if(t[i]==t[j+1]) nxt[i]=++j;
}
```

求出 $t$ 串的 $border$ 之后，就可以利用 $border$ 去和 $s$ 匹配了。

```cpp
j=1;
for(int i=1;i<=n;++i)
{
	while(j>1&&s[i]!=t[j]) j=nxt[j-1]+1;
	if(s[i]==t[j])
	{
		if(j==m)
		{
			cout<<i-m+1<<'\n';
			j=nxt[j]+1;
		}
		else ++j;
	}	
}
```

### 循环节

给定一个字符串 $S$，求一个最短的字符串，使得字符串无限自我拼接之后，$S$ 是它的一个子串。

也就是整个字符串可以分成以下部分：

![图片.png](https://s2.loli.net/2023/11/03/GzrfW6NREMmahly.png)

那么绿色部分就是紫色串 $S$ 的一个循环节。

我们把第一个绿色部分删去，得到蓝色部分：

![图片.png](https://s2.loli.net/2023/11/03/NftQb6yxO3qvuXC.png)

而因为绿色是循环的，所以两段蓝色部分恰好形成一个 $border$。

反过来考虑，最短循环节就是整个字符串的长度减去最长 $border$ 的长度。

### 练习题

[P3375 【模板】KMP  ](https://www.luogu.com.cn/problem/P3375)

[P4391 [BOI2009] Radio Transmission 无线传输  ](https://www.luogu.com.cn/problem/P4391)

[P3426 [POI2005] SZA-Template  ](https://www.luogu.com.cn/problem/P3426)

[P1470 [USACO2.3] 最长前缀 Longest Prefix  ](https://www.luogu.com.cn/problem/P1470)

[P3435 [POI2006] OKR-Periods of Words  ](https://www.luogu.com.cn/problem/P3435)

[P2375 [NOI2014] 动物园  ](https://www.luogu.com.cn/problem/P2375)

[Prefix Function Queries  ](https://www.luogu.com.cn/problem/CF1721E)

