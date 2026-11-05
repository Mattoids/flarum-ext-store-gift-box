module.exports = require('flarum-webpack-config')({
  // 允许从商店插件导入共享模块（金额格式化工具，口径与 store 一致）
  useExtensions: ['mattoid-store'],
});
