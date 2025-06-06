// 首页应用
document.addEventListener('DOMContentLoaded', function () {
  // 检查环境变量
  console.log('环境变量检查:');
  console.log('__MODE__:', PAGE_NAME);

  // 创建环境变量显示元素
  const envDisplay = document.createElement('div');
  envDisplay.style.position = 'fixed';
  envDisplay.style.top = '10px';
  envDisplay.style.right = '10px';
  envDisplay.style.padding = '10px';
  envDisplay.style.background = 'rgba(255,255,255,0.7)';
  envDisplay.style.zIndex = '9999';
  envDisplay.style.borderRadius = '8px';
  envDisplay.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  envDisplay.innerHTML = `
    <div style="margin-bottom:8px"><strong>环境变量:</strong></div>
    <div>MODE: ${__MODE__}</div>
  `;
  document.body.appendChild(envDisplay);

  // 加载CSS Module并测试
  import('./test-styles.module.css')
    .then(styles => {
      console.log('加载的CSS Module:', styles);

      // 添加CSS测试元素
      const cssTestElement = document.createElement('div');
      cssTestElement.className = 'css-test-element';
      cssTestElement.innerHTML = `
      <h3>CSS Modules 测试</h3>
      <p>这个测试展示了不同策略下CSS Module的类名生成差异</p>
      
      <div class="${styles.testBox}">
        这是基础样式框 (.testBox)
      </div>
      
      <div class="${styles.testBox} ${styles.mobileStyle}">
        这是移动端样式 (.mobileStyle)
      </div>
      
      <div class="${styles.testBox} ${styles.pcStyle}">
        这是PC端样式 (.pcStyle)
      </div>
      
      <div>
        <strong>生成的类名:</strong>
        <pre style="background:#f0f0f0;padding:5px;margin-top:5px;overflow:auto;font-size:12px;">${JSON.stringify(
          styles,
          null,
          2
        )}</pre>
      </div>
    `;
      document.body.appendChild(cssTestElement);
    })
    .catch(err => {
      console.error('无法加载CSS Module:', err);
    });

  const app = document.getElementById('app');

  if (!app) return;

  app.innerHTML = `
    <div class="home-container">
      <header class="hero-section">
        <div class="hero-content">
          <h1>🚀 Vite 多页面插件演示</h1>
          <p>探索现代多页面应用的强大功能</p>
          <div class="hero-buttons">
            <a href="/vue-app.html" class="btn btn-primary">📱 Vue 移动端</a>
            <a href="/app.html" class="btn btn-secondary">📱 原生移动端</a>
            <a href="/dashboard.html" class="btn btn-secondary">🎛️ 管理后台</a>
          </div>
        </div>
        <div class="hero-image">
          <div class="floating-cards">
            <div class="card card-1">Vue3</div>
            <div class="card card-2">PostCSS</div>
            <div class="card card-3">Vite</div>
            <div class="card card-4">TypeScript</div>
          </div>
        </div>
      </header>
      
      <main class="main-content">
        <section class="features">
          <h2>🎯 核心特性</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon">⚡</div>
              <h3>快速构建</h3>
              <p>基于 Vite 的超快构建工具，支持热模块替换</p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">📱</div>
              <h3>移动端适配</h3>
              <p>PostCSS 自动 rem 转换，完美适配各种屏幕</p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">🎨</div>
              <h3>多页面路由</h3>
              <p>自动扫描页面入口，智能生成路由配置</p>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon">🔧</div>
              <h3>灵活配置</h3>
              <p>支持函数配置，根据页面类型动态设置策略</p>
            </div>
          </div>
        </section>
        
        <section class="demo-links">
          <h2>📚 演示页面</h2>
          <div class="demo-grid">
            <a href="/vue-app.html" class="demo-item">
              <div class="demo-icon">🟢</div>
              <h3>Vue 移动端应用</h3>
              <p>Vue3 + Composition API + rem 适配</p>
              <span class="demo-tag">推荐</span>
            </a>
            
            <a href="/app.html" class="demo-item">
              <div class="demo-icon">📱</div>
              <h3>原生移动端应用</h3>
              <p>原生 JavaScript + PostCSS</p>
              <span class="demo-tag">基础</span>
            </a>
            
            <a href="/dashboard.html" class="demo-item">
              <div class="demo-icon">📊</div>
              <h3>管理后台</h3>
              <p>现代 ES 语法 + 数据可视化</p>
              <span class="demo-tag">企业级</span>
            </a>
          </div>
        </section>
      </main>
      
      <footer class="footer">
        <p>© 2024 Vite Multi-Page Plugin Demo</p>
        <p>构建时间: <span id="buildTime">-</span></p>
      </footer>
    </div>
  `;

  // 更新构建时间
  document.getElementById('buildTime').textContent = new Date().toLocaleString('zh-CN');

  // 添加浮动动画
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.5}s`;
  });

  console.log('🏠 首页已加载');
});

// 添加首页样式
const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  /* CSS测试元素样式 */
  .css-test-element {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 300px;
    padding: 10px;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 3px 6px rgba(0,0,0,0.1);
    overflow: auto;
    max-height: 80vh;
  }
  
  .css-test-element h3 {
    margin-bottom: 10px;
    font-size: 16px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
  }
  
  .css-test-element p {
    margin-bottom: 10px;
    color: #666;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  .home-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .hero-section {
    display: flex;
    align-items: center;
    min-height: 80vh;
    padding: 40px 20px;
    color: white;
  }
  
  .hero-content {
    flex: 1;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }
  
  .hero-content h1 {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 20px;
    animation: fadeInUp 1s ease-out;
  }
  
  .hero-content p {
    font-size: 1.2rem;
    margin-bottom: 40px;
    opacity: 0.9;
    animation: fadeInUp 1s ease-out 0.2s both;
  }
  
  .hero-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
    animation: fadeInUp 1s ease-out 0.4s both;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 15px 30px;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 500;
    transition: all 0.3s ease;
    font-size: 16px;
  }
  
  .btn-primary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  
  .btn-primary:hover {
    background: white;
    color: #667eea;
    transform: translateY(-2px);
  }
  
  .btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  .floating-cards {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }
  
  .card {
    position: absolute;
    padding: 15px 25px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-weight: 500;
    animation: float 6s ease-in-out infinite;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .card-1 { top: 20%; left: 10%; animation-delay: 0s; }
  .card-2 { top: 60%; right: 15%; animation-delay: 1.5s; }
  .card-3 { top: 30%; right: 25%; animation-delay: 3s; }
  .card-4 { bottom: 20%; left: 20%; animation-delay: 4.5s; }
  
  .main-content {
    background: white;
    padding: 80px 20px;
  }
  
  .features, .demo-links {
    max-width: 1200px;
    margin: 0 auto 80px;
  }
  
  .features h2, .demo-links h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 50px;
    color: #333;
  }
  
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
  }
  
  .feature-card {
    text-align: center;
    padding: 40px 20px;
    border-radius: 16px;
    background: #f8f9fa;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }
  
  .feature-icon {
    font-size: 3rem;
    margin-bottom: 20px;
  }
  
  .feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #333;
  }
  
  .feature-card p {
    color: #666;
    line-height: 1.6;
  }
  
  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 25px;
  }
  
  .demo-item {
    display: block;
    padding: 30px;
    background: white;
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .demo-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  }
  
  .demo-icon {
    font-size: 2.5rem;
    margin-bottom: 20px;
  }
  
  .demo-item h3 {
    font-size: 1.4rem;
    margin-bottom: 10px;
    color: #333;
  }
  
  .demo-item p {
    color: #666;
    margin-bottom: 15px;
  }
  
  .demo-tag {
    position: absolute;
    top: 15px;
    right: 15px;
    padding: 5px 12px;
    background: #667eea;
    color: white;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 30px 20px;
  }
  
  .footer p {
    margin: 5px 0;
    opacity: 0.8;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    33% {
      transform: translateY(-20px) rotate(2deg);
    }
    66% {
      transform: translateY(-10px) rotate(-2deg);
    }
  }
  
  @media (max-width: 768px) {
    .hero-content h1 {
      font-size: 2rem;
    }
    
    .hero-buttons {
      flex-direction: column;
      align-items: center;
    }
    
    .btn {
      width: 100%;
      max-width: 300px;
      justify-content: center;
    }
    
    .features h2, .demo-links h2 {
      font-size: 2rem;
    }
    
    .floating-cards {
      display: none;
    }
  }
`;

document.head.appendChild(style);

// 在页面加载完成后，计算并显示实际值
window.addEventListener('load', function () {
  const testElement = document.querySelector('.css-test-element');
  if (testElement) {
    const computedStyle = window.getComputedStyle(testElement);
    testElement.setAttribute('data-width', computedStyle.width);
    testElement.setAttribute('data-font-size', computedStyle.fontSize);

    console.log('CSS测试 - 计算后宽度:', computedStyle.width);
    console.log('CSS测试 - 计算后字体大小:', computedStyle.fontSize);
  }
});
