// 关于页面
document.addEventListener('DOMContentLoaded', function () {
  const app = document.getElementById('app');

  if (!app) return;

  app.innerHTML = `
    <div class="about-container">
      <header class="about-header">
        <h1>📖 关于项目</h1>
        <p>了解 Vite 多页面插件的设计理念和技术实现</p>
      </header>
      
      <main class="about-main">
        <section class="intro-section">
          <h2>🎯 项目简介</h2>
          <p>vite-plugin-multi-page 是一个强大的 Vite 插件，专为构建现代多页面应用而设计。</p>
          
          <div class="highlight-box">
            <h3>核心优势</h3>
            <ul>
              <li>🚀 <strong>零配置启动</strong>：自动扫描页面入口文件</li>
              <li>📱 <strong>移动端优化</strong>：内置 PostCSS rem 适配</li>
              <li>⚡ <strong>快速构建</strong>：基于 Vite 的超快构建速度</li>
              <li>🎨 <strong>灵活配置</strong>：支持函数式动态配置</li>
            </ul>
          </div>
        </section>
        
        <section class="tech-section">
          <h2>🛠️ 技术栈</h2>
          <div class="tech-grid">
            <div class="tech-card">
              <div class="tech-icon">⚡</div>
              <h3>Vite</h3>
              <p>下一代前端构建工具</p>
            </div>
            
            <div class="tech-card">
              <div class="tech-icon">🟢</div>
              <h3>Vue 3</h3>
              <p>渐进式 JavaScript 框架</p>
            </div>
            
            <div class="tech-card">
              <div class="tech-icon">🎨</div>
              <h3>PostCSS</h3>
              <p>现代 CSS 处理器</p>
            </div>
            
            <div class="tech-card">
              <div class="tech-icon">📘</div>
              <h3>TypeScript</h3>
              <p>JavaScript 的超集</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer class="about-footer">
        <p>🎉 感谢使用 Vite 多页面插件</p>
        <div class="footer-links">
          <a href="/home.html">🏠 返回首页</a>
          <a href="/vue-app.html">📱 移动端演示</a>
          <a href="/dashboard.html">🎛️ 管理后台</a>
        </div>
      </footer>
    </div>
  `;

  console.log('📖 关于页面已加载');
});

// 添加关于页面样式
const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f8f9fa;
  }
  
  .about-container {
    min-height: 100vh;
  }
  
  .about-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 80px 20px;
    text-align: center;
  }
  
  .about-header h1 {
    font-size: 3rem;
    margin-bottom: 20px;
  }
  
  .about-header p {
    font-size: 1.2rem;
    opacity: 0.9;
  }
  
  .about-main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 80px 20px;
  }
  
  section {
    margin-bottom: 60px;
  }
  
  h2 {
    font-size: 2.5rem;
    margin-bottom: 30px;
    color: #333;
  }
  
  .intro-section p {
    font-size: 1.1rem;
    margin-bottom: 30px;
    color: #666;
  }
  
  .highlight-box {
    background: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
    padding: 30px;
    border-radius: 16px;
    border-left: 4px solid #667eea;
  }
  
  .highlight-box h3 {
    font-size: 1.5rem;
    margin-bottom: 20px;
    color: #333;
  }
  
  .highlight-box ul {
    list-style: none;
    padding: 0;
  }
  
  .highlight-box li {
    padding: 10px 0;
    font-size: 1.05rem;
    color: #555;
  }
  
  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
  }
  
  .tech-card {
    background: white;
    padding: 30px;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }
  
  .tech-card:hover {
    transform: translateY(-5px);
  }
  
  .tech-icon {
    font-size: 3rem;
    margin-bottom: 20px;
  }
  
  .tech-card h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #333;
  }
  
  .tech-card p {
    color: #666;
  }
  
  .about-footer {
    background: #333;
    color: white;
    padding: 40px 20px;
    text-align: center;
  }
  
  .about-footer p {
    margin-bottom: 20px;
    opacity: 0.8;
  }
  
  .footer-links {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .footer-links a {
    color: white;
    text-decoration: none;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: background 0.3s ease;
  }
  
  .footer-links a:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    .about-header h1 {
      font-size: 2rem;
    }
    
    h2 {
      font-size: 2rem;
    }
    
    .footer-links {
      flex-direction: column;
      align-items: center;
    }
    
    .footer-links a {
      width: 100%;
      max-width: 300px;
    }
  }
`;

document.head.appendChild(style);
