/**
 * @file 测试getDiffFiles
 * @author zhangluyao01
 */
const colors = require('colors');
const {getDiffFiles} = require('../utils');
let branch = 'origin/master';

console.log(getDiffFiles(branch));

// 测试分支不存在的情况
branch = 'a';
console.log(getDiffFiles(branch));
