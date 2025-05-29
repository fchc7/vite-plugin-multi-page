import './mobile.css';

// 设置根字体大小用于 rem 适配
function setRemBase() {
  const docEl = document.documentElement;
  const clientWidth = docEl.clientWidth;
  if (!clientWidth) return;

  // 基于 375px 设计稿，设置根字体大小
  docEl.style.fontSize = (clientWidth / 375) * 37.5 + 'px';
}

// 页面加载时设置
setRemBase();

// 窗口大小改变时重新设置
window.addEventListener('resize', setRemBase);

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function () {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="mobile-container">
      <header class="mobile-header">
        <h1>📱 移动端应用</h1>
        <p>PostCSS rem 适配演示</p>
      </header>
      
      <main class="mobile-main">
        <section class="demo-section">
          <h2>📊 设备信息</h2>
          <div class="info-grid">
            <div class="info-item">
              <label>屏幕宽度:</label>
              <span id="screenWidth">-</span>
            </div>
            <div class="info-item">
              <label>根字体:</label>
              <span id="fontSize">-</span>
            </div>
            <div class="info-item">
              <label>像素比:</label>
              <span>${window.devicePixelRatio || 1}</span>
            </div>
            <div class="info-item">
              <label>用户代理:</label>
              <span class="user-agent">${
                navigator.userAgent.includes('Mobile') ? '移动设备' : '桌面设备'
              }</span>
            </div>
          </div>
        </section>
        
        <section class="demo-section">
          <h2>🎛️ 交互演示</h2>
          <div class="controls">
            <button id="countBtn" class="btn btn-primary">
              点击次数: <span id="count">0</span>
            </button>
            <input id="textInput" type="text" class="input" placeholder="输入一些文字...">
            <div id="inputDisplay" class="input-display">输入内容将显示在这里</div>
          </div>
        </section>
        
        <section class="demo-section">
          <h2>📐 rem 演示</h2>
          <div class="rem-demo">
            <div class="box small">小盒子<br>2rem</div>
            <div class="box medium">中盒子<br>3rem</div>
            <div class="box large">大盒子<br>4rem</div>
          </div>
        </section>
      </main>
      
      <footer class="mobile-footer">
        <p>© 2024 移动端多页面应用演示</p>
      </footer>
    </div>
  `;

  // 更新设备信息
  function updateDeviceInfo() {
    document.getElementById('screenWidth').textContent = window.innerWidth + 'px';
    document.getElementById('fontSize').textContent =
      parseFloat(getComputedStyle(document.documentElement).fontSize).toFixed(1) + 'px';
  }

  updateDeviceInfo();
  window.addEventListener('resize', updateDeviceInfo);

  // 计数器功能
  let count = 0;
  const countBtn = document.getElementById('countBtn');
  const countDisplay = document.getElementById('count');

  countBtn.addEventListener('click', function () {
    count++;
    countDisplay.textContent = count;

    // 添加点击效果
    countBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      countBtn.style.transform = 'scale(1)';
    }, 150);
  });

  // 输入框功能
  const textInput = document.getElementById('textInput');
  const inputDisplay = document.getElementById('inputDisplay');

  textInput.addEventListener('input', function () {
    const value = this.value.trim();
    inputDisplay.textContent = value || '输入内容将显示在这里';
    inputDisplay.style.color = value ? '#333' : '#999';
  });

  console.log('📱 移动端应用已加载');
  console.log('当前构建类型:', process.env.BUILD_TYPE || 'default');
});
