// 管理后台仪表盘页面
import './admin.css';

// 管理后台应用初始化
document.addEventListener('DOMContentLoaded', function () {
  const app = document.getElementById('app');

  if (!app) return;

  app.innerHTML = `
    <div class="admin-container">
      <aside class="admin-sidebar">
        <div class="logo">
          <h2>🎛️ 管理后台</h2>
        </div>
        <nav class="admin-nav">
          <a href="#dashboard" class="nav-item active">📊 仪表板</a>
          <a href="#users" class="nav-item">👥 用户管理</a>
          <a href="#content" class="nav-item">📝 内容管理</a>
          <a href="#settings" class="nav-item">⚙️ 系统设置</a>
        </nav>
      </aside>
      
      <main class="admin-main">
        <header class="admin-header">
          <h1>仪表板</h1>
          <div class="admin-info">
            <span>现代 ES 语法演示</span>
            <span id="currentTime">-</span>
          </div>
        </header>
        
        <div class="admin-content">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <h3 id="userCount">1,234</h3>
                <p>总用户数</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">📝</div>
              <div class="stat-info">
                <h3 id="contentCount">567</h3>
                <p>内容数量</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">📈</div>
              <div class="stat-info">
                <h3 id="viewCount">89.2k</h3>
                <p>总浏览量</p>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <h3 id="revenue">¥23,456</h3>
                <p>本月收入</p>
              </div>
            </div>
          </div>
          
          <div class="charts-section">
            <div class="chart-card">
              <h3>📊 访问趋势</h3>
              <div class="chart-placeholder">
                <div class="simple-chart"></div>
              </div>
            </div>
            
            <div class="chart-card">
              <h3>🥧 用户分布</h3>
              <div class="chart-placeholder">
                <div class="pie-chart">
                  <div class="pie-item">📱 移动端: 45%</div>
                  <div class="pie-item">💻 桌面端: 35%</div>
                  <div class="pie-item">📺 平板端: 20%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // 更新时间
  function updateTime() {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
      timeEl.textContent = new Date().toLocaleTimeString('zh-CN');
    }
  }

  updateTime();
  setInterval(updateTime, 1000);

  // 导航交互
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();

      // 移除所有活动状态
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

      // 添加当前活动状态
      this.classList.add('active');

      // 更新标题
      const title = this.textContent.replace(/^[^\s]+\s/, '');
      const headerTitle = document.querySelector('.admin-header h1');
      if (headerTitle) {
        headerTitle.textContent = title;
      }
    });
  });

  console.log('🎛️ 管理后台应用已加载');
  console.log('支持现代 ES 语法:', { arrow: 'functions', spread: [1, 2, 3] });
}); 