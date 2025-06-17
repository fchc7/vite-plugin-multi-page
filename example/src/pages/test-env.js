// 测试环境变量注入的页面
console.log('===== 环境变量测试 =====');
console.log('VITE_CURRENT_PAGE_NAME:', import.meta.env.VITE_CURRENT_PAGE_NAME);
console.log('VITE_CURRENT_STRATEGY:', import.meta.env.VITE_CURRENT_STRATEGY);
console.log('VITE_BUILD_TIMESTAMP:', import.meta.env.VITE_BUILD_TIMESTAMP);

// 显示在页面上
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <h1>环境变量测试页面</h1>
    <div style="padding: 20px; background: #f5f5f5; margin: 20px; border-radius: 8px;">
      <h2>注入的环境变量:</h2>
      <ul>
        <li><strong>页面名称:</strong> ${import.meta.env.VITE_CURRENT_PAGE_NAME || '未设置'}</li>
        <li><strong>当前策略:</strong> ${import.meta.env.VITE_CURRENT_STRATEGY || '未设置'}</li>
        <li><strong>构建时间:</strong> ${import.meta.env.VITE_BUILD_TIMESTAMP || '未设置'}</li>
      </ul>
    </div>
  `;
});
