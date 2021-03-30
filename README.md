# fis3-deploy-diff-http-push

fis3插件，获取本地文件和远程文件的diff实现增量上传。

## 原理

需要远端提供一个接口获取远端代码对应的分支信息，分支信息可以为分支名，也可以是tag，远端接口返回的格式为
```json
{
    "$appName": "$branchName || $branchTag || [$branchName, $branchTag]"
}
```

插件会请求远端的接口获取分支信息，并利用git比较本地和远端代码的diff，仅上传有diff的文件
```sh
# 比较本地文件和远端文件的diff

# 本地修改领先远端的文件
git diff --name-only $branchName

# 远端文件领先本地的diff
git diff --name-only $branchName...HEAD

# untracked文件
git ls-files --others --exclude-standard
```

## 依赖

fis3
git

## 使用方法

和fis3的http-push插件的使用方法相似。相比于http-push插件增加了`branchInfoApi`和`minFileCount`两个配置项，其中`branchInfoApi`表示获取远端分支信息的api，默认值是`receiver + '/getBranchInfo'`；`minFileCount`表示当需要上传的文件小于等于`minFileCount`时，不会比较本地和远端代码的diff，全部上传文件，默认值是20。

1. 安装插件
```sh
npm install fis3-deploy-diff-http-push
```

2. 修改fis.conf文件
```js
fis.match('*', {
    deploy: fis.plugin('http-diff-push', {
        receiver: 'http://cq.01.p.p.baidu.com:8888/receiver',
        branchInfoApi: 'http://cq.01.p.p.baidu.com:8888/receiver/getBranchInfo', // 获取远端代码的分支信息，默认值receiver + '/getBranchInfo'
        minFileCount: 20, // 需要上传的文件小于等于`minFileCount`时，不会比较本地和远端代码的diff，全部上传文件，默认值是20。
        to: '/home/work/htdocs' // 注意这个是指的是测试机器的路径，而非本地机器
    })
});
```
