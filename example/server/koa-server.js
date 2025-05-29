import Koa from 'koa';
import serve from 'koa-static';
import Router from 'koa-router';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, stat, readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Koa();
const router = new Router();

// 构建产物目录
const distPath = join(__dirname, '../dist');

// 获取文件大小格式化
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 递归获取目录文件信息
async function getDirectoryInfo(dirPath, relativePath = '') {
  const files = [];
  try {
    const items = await readdir(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const itemStat = await stat(fullPath);
      const itemRelativePath = join(relativePath, item);

      if (itemStat.isDirectory()) {
        const subFiles = await getDirectoryInfo(fullPath, itemRelativePath);
        files.push({
          name: item,
          type: 'directory',
          path: itemRelativePath,
          size: '-',
          files: subFiles.length,
          children: subFiles,
        });
      } else {
        files.push({
          name: item,
          type: 'file',
          path: itemRelativePath,
          size: formatBytes(itemStat.size),
          bytes: itemStat.size,
          modified: itemStat.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('读取目录失败:', error.message);
  }

  return files.sort((a, b) => {
    // 目录排在前面，然后按名称排序
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// 构建产物分析
router.get('/api/build-analysis', async ctx => {
  try {
    const files = await getDirectoryInfo(distPath);

    // 计算总大小
    function calculateTotalSize(fileList) {
      return fileList.reduce((total, file) => {
        if (file.type === 'file') {
          return total + (file.bytes || 0);
        } else if (file.children) {
          return total + calculateTotalSize(file.children);
        }
        return total;
      }, 0);
    }

    const totalSize = calculateTotalSize(files);

    // 按文件类型分类
    const fileTypes = {};
    function categorizeFiles(fileList) {
      fileList.forEach(file => {
        if (file.type === 'file') {
          const ext = file.name.split('.').pop().toLowerCase();
          if (!fileTypes[ext]) {
            fileTypes[ext] = { count: 0, size: 0, files: [] };
          }
          fileTypes[ext].count++;
          fileTypes[ext].size += file.bytes || 0;
          fileTypes[ext].files.push(file);
        } else if (file.children) {
          categorizeFiles(file.children);
        }
      });
    }

    categorizeFiles(files);

    // 找出最大的文件
    const allFiles = [];
    function collectFiles(fileList) {
      fileList.forEach(file => {
        if (file.type === 'file') {
          allFiles.push(file);
        } else if (file.children) {
          collectFiles(file.children);
        }
      });
    }

    collectFiles(files);
    const largestFiles = allFiles.sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 10);

    ctx.body = {
      success: true,
      data: {
        files,
        totalSize: formatBytes(totalSize),
        totalSizeBytes: totalSize,
        fileCount: allFiles.length,
        fileTypes: Object.entries(fileTypes)
          .map(([ext, info]) => ({
            extension: ext,
            count: info.count,
            size: formatBytes(info.size),
            sizeBytes: info.size,
            files: info.files,
          }))
          .sort((a, b) => b.sizeBytes - a.sizeBytes),
        largestFiles,
      },
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
    };
  }
});

// 获取特定文件内容
router.get('/api/file-content/:path+', async ctx => {
  try {
    const filePath = join(distPath, ctx.params.path);
    const content = await readFile(filePath, 'utf-8');
    const fileStats = await stat(filePath);

    ctx.body = {
      success: true,
      data: {
        content,
        size: formatBytes(fileStats.size),
        modified: fileStats.mtime.toISOString(),
        path: ctx.params.path,
      },
    };
  } catch (error) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      error: '文件不存在或无法读取',
    };
  }
});

// 首页重定向到仪表板
router.get('/', async ctx => {
  ctx.redirect('/dashboard');
});

// 使用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 静态文件服务（dist 目录）
app.use(serve(distPath));

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Koa 服务器已启动!

演示页面:
- Vue 移动端: http://localhost:${PORT}/mobile.html
- 首页: http://localhost:${PORT}/home.html
- 关于: http://localhost:${PORT}/about.html

API 接口:
- 构建分析: http://localhost:${PORT}/api/build-analysis
  `);
});
