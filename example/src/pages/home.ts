console.log("欢迎来到首页！");

document.body.innerHTML = `
  <div style="max-width: 600px; margin: 50px auto; text-align: center; font-family: Arial, sans-serif;">
    <h1 style="color: #2c3e50;">🏠 首页</h1>
    <p style="color: #7f8c8d; margin: 20px 0;">这是一个多页面应用的首页。</p>
    <div style="margin-top: 30px;">
      <a href="/about" style="color: #3498db; text-decoration: none; margin: 0 10px;">关于我们</a>
      <a href="/contact" style="color: #3498db; text-decoration: none; margin: 0 10px;">联系我们</a>
    </div>
  </div>
`;
