// 环境变量测试
document.addEventListener('DOMContentLoaded', function () {
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>环境变量测试</h1>
      <div>
        <strong>__MODE__:</strong> <span id="mode">${__MODE__}</span>
      </div>
      <div>
        <strong>__THEME__:</strong> <span id="theme">${__THEME__}</span>
      </div>
      <div>
        <strong>__VERSION__:</strong> <span id="version">${__VERSION__}</span>
      </div>
      <div>
        <strong>__TEST_VAR__:</strong> <span id="test">${__TEST_VAR__}</span>
      </div>
    </div>
  `;

  console.log('环境变量检查:');
  console.log('__MODE__:', __MODE__);
  console.log('__THEME__:', __THEME__);
  console.log('__VERSION__:', __VERSION__);
});
