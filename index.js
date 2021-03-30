/**
 * @file fis3插件，获取本地和服务器文件的diff，实现增量上传
 * 服务端需要提供一个接口来获取服务端代码所对应的分支信息
 * 利用git比较本地分支和服务端分支
 *
 * @author zhangluyao01
 */
const axios = require('axios');
const colors = require('colors');
const path = require('path');
const {promisify} = require('util');
const {getDiffFiles} = require('./utils');

const _ = fis.util;

async function upload(receiver, to, data, release, content, file) {
    const subpath = file.subpath;
    data.to = _(path.join(to, release));
    let res;
    let err;
    let json;

    try {
        res = await promisify(_.upload)(
            // url, request options, post data, file
            receiver, null, data, content, subpath,
        );
    }
    catch (error) {
        err = error;
    }

    try {
        json = res ? JSON.parse(res) : null;
    }
    catch (e) {}

    if (!err && json && json.errno) {
        return json;
    }
    else if (err || !json && res !== '0') {
        return `upload file [${subpath}] to [${to}] by receiver [${receiver}] error [${err || res}]`;
    }

    const time = `[${fis.log.now(true)}]`;
    process.stdout.write(
        '\n - '.green.bold
        + time.grey + ' '
        + subpath.replace(/^\//, '')
        + ' >> '.yellow.bold
        + to + release
    );

    return;
}

module.exports = async function (options, modified, total, callback) {
    if (!options.to) {
        throw new Error('options.to is required!');
    }

    const to = options.to;
    const data = options.data || {};
    let receiver = options.receiver;
    let branchInfoApi = options.branchInfoApi;

    if (options.host) {
        receiver = options.receiver = options.host + '/v1/upload';
    }

    if (!options.receiver) {
        throw new Error('options.receiver is required!');
    }

    if (!branchInfoApi) {
        branchInfoApi = receiver + '/getBranchInfo';
    }

    let targetFiles = modified;
    // 修改文件的数目大于特定的数值才开启diff上传
    if (modified.length > (options.minFileCount || 20)) {
        const namespace = fis.config.get('namespace');
        const result = await axios.get(branchInfoApi) || {};
        const branchInfo = result.data || {};
        const diffFiles = getDiffFiles(branchInfo[namespace] || 'origin/master');

        targetFiles = modified.filter(file => diffFiles.has(file.subpath.replace(/^\//, '')));
        process.stdout.write(`\nThere are ${targetFiles.length} modified files.\n`);
    }

    let retryCount = options.retry;
    for (let i = 0; i < targetFiles.length; i++) {
        let file = targetFiles[i];
        let error = await upload(receiver, to, data, file.getHashRelease(), file.getContent(), file);

        // 重试
        while (error && --retryCount) {
            error = await upload(receiver, to, data, file.getHashRelease(), file.getContent(), file);
        }

        if (error) {
            throw new Error(error.errmsg || error);
        }
    }

    callback();
};

module.exports.options = {
    // 允许重试两次。
    retry: 2
};
