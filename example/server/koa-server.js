import Koa from 'koa';
import Router from 'koa-router';
import serve from 'koa-static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Koa();
const router = new Router();

// 从命令行参数获取页面名称，默认为 'home'
const args = process.argv.slice(2);
const pageArg = args.find(arg => arg.startsWith('--page='));
const pageName = pageArg ? pageArg.split('=')[1] : 'home';

// 验证页面目录是否存在
const distPath = path.join(__dirname, '../dist');
const pagePath = path.join(distPath, pageName);

if (!fs.existsSync(pagePath)) {
  console.error(`❌ 错误: 页面 '${pageName}' 不存在`);
  console.log(`📁 可用的页面:`);

  // 列出所有可用页面
  try {
    const pages = fs.readdirSync(distPath).filter(item => {
      return fs.statSync(path.join(distPath, item)).isDirectory();
    });
    pages.forEach(page => console.log(`   - ${page}`));
  } catch (error) {
    console.error('无法读取 dist 目录');
  }

  console.log(`\n💡 使用方法: node server/koa-server.js --page=页面名称`);
  process.exit(1);
}

// 设置静态文件服务，指向特定页面目录
app.use(serve(pagePath));

// 路由配置
router.get('/', async ctx => {
  const indexPath = path.join(pagePath, 'index.html');

  if (fs.existsSync(indexPath)) {
    ctx.type = 'html';
    ctx.body = fs.readFileSync(indexPath, 'utf8');
  } else {
    ctx.status = 404;
    ctx.body = `页面 '${pageName}' 的 index.html 文件不存在`;
  }
});

// 处理所有路径，支持 SPA 路由
router.get('/(.*)', async ctx => {
  const requestedPath = ctx.path;
  const filePath = path.join(pagePath, requestedPath);

  // 检查是否是文件请求
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return; // 让静态文件中间件处理
  }

  // 对于非文件请求，返回 index.html (支持 SPA 路由)
  const indexPath = path.join(pagePath, 'index.html');
  if (fs.existsSync(indexPath)) {
    ctx.type = 'html';
    ctx.body = fs.readFileSync(indexPath, 'utf8');
  } else {
    ctx.status = 404;
    ctx.body = `页面 '${pageName}' 的 index.html 文件不存在`;
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 服务器已启动`);
  console.log(`📄 当前预览页面: ${pageName}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`📁 服务目录: ${pagePath}`);
  console.log(`\n💡 切换页面: node server/koa-server.js --page=其他页面名称`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器已关闭');
  process.exit(0);
});
