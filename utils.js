/**
 * @file 工具文件
 * @author zhangluyao01
 */
const {execSync} = require('child_process');

/**
 * 获取diff文件列表
 *
 * @param {string} branchName 远端的分支名
 * @returns {Set<string, boolean>} 返回diff文件的列表
 */
module.exports.getDiffFiles = function(branchName) {
    // 先fetch一下
    execSync('git fetch');
    // 检查分支是否存在，icode会自动删除合会主干的上线分支，但是会保留一个tag，我们没有办法判断分支是否已经合入，所以要判断分支名和tag是否存在
    if (!Array.isArray(branchName)) {
        branchName = [branchName];
    }
    let flag = branchName.some(item => {
        let result;
        try {
            result = execSync(`git rev-parse --quiet --verify ${item}`, {encoding: 'utf-8'}).trim();
        }
        catch (error) {}
        if (result) {
            branchName = item;
            return true;
        }

        return false;
    });

    if (!flag) {
        console.log(`\nError: Branch ${branchName} doesn't exist!\n`.red);
        process.exit(1);
    }

    // 获取修改文件的列表
    // 获取所有的修改文件，和执行命令式所在目录无关，文件名相对于git的根目录
    // modified files有两种，一种是当前修改领先目标分支的文件，另一种是目标分支领先当前HEAD的文件
    // 第一种情况，获取当前修改领先目标分支的文件
    const modifiedFiles1 = execSync(`git diff --name-only ${branchName}|cat`, {encoding: 'utf-8'})
        .trim().split('\n');

    // 第二种情况，获取目标分支领先当前HEAD的文件
    // 这个操作是为了避免本地未修改的文件和服务器不一致的情况
    // 比如服务器删除了文件A且服务器的文件B删除了对A的引用，本地没有删除文件A且文件B仍然引用了文件A
    // 只考虑第一种情况，如果本地没有修改文件A，但是修改了文件B，那么服务器的B文件会被本地的B文件覆盖
    // 由于A文件没有修改，所以它不会被上传，造成服务端B文件引用了一个不存在的文件A，从而导致报错
    const modifiedFiles2 = execSync(`git diff --name-only ${branchName}...HEAD|cat`, {encoding: 'utf-8'})
        .trim().split('\n');

    // 获取untracked文件
    // 此命令和执行命令时所在的目录有关，仅可获取本目录下未untracked的文件，文件名是相对于执行命令时所在目录
    const untrackedFiles = execSync('git ls-files --others --exclude-standard|cat', {encoding: 'utf-8'})
        .trim().split('\n');

    return new Set([...modifiedFiles1, ...modifiedFiles2, ...untrackedFiles]);
}
