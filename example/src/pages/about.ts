console.log("这是关于页面！");

document.body.innerHTML = `
  <div style="max-width: 600px; margin: 50px auto; text-align: center; font-family: Arial, sans-serif;">
    <h1 style="color: #2c3e50;">📖 关于我们</h1>
    <p style="color: #7f8c8d; margin: 20px 0;">我们是一个使用Vite构建的多页面应用。</p>
    <p style="color: #7f8c8d; margin: 20px 0;">使用 vite-plugin-multi-page 插件实现智能路由。</p>
    <div style="margin-top: 30px;">
      <a href="/" style="color: #3498db; text-decoration: none; margin: 0 10px;">返回首页</a>
      <a href="/contact" style="color: #3498db; text-decoration: none; margin: 0 10px;">联系我们</a>
    </div>
  </div>
`;
