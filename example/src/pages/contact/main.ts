console.log("这是联系页面（目录main文件）！");

document.body.innerHTML = `
  <div style="max-width: 600px; margin: 50px auto; text-align: center; font-family: Arial, sans-serif;">
    <h1 style="color: #2c3e50;">📞 联系我们</h1>
    <p style="color: #7f8c8d; margin: 20px 0;">这个页面由 contact/main.ts 提供（优先级2）。</p>
    <p style="color: #7f8c8d; margin: 10px 0;">邮箱: hello@example.com</p>
    <p style="color: #7f8c8d; margin: 10px 0;">电话: 123-456-7890</p>
    <div style="margin-top: 30px;">
      <a href="/" style="color: #3498db; text-decoration: none; margin: 0 10px;">返回首页</a>
      <a href="/about" style="color: #3498db; text-decoration: none; margin: 0 10px;">关于我们</a>
    </div>
  </div>
`;
