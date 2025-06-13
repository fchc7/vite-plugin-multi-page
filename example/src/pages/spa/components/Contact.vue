<template>
  <div class="contact">
    <h1>联系我们</h1>

    <div class="contact-form">
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="name">姓名：</label>
          <input type="text" id="name" v-model="form.name" placeholder="请输入您的姓名" />
        </div>

        <div class="form-group">
          <label for="email">邮箱：</label>
          <input type="email" id="email" v-model="form.email" placeholder="请输入您的邮箱" />
        </div>

        <div class="form-group">
          <label for="message">消息：</label>
          <textarea
            id="message"
            v-model="form.message"
            rows="5"
            placeholder="请输入您的消息"
          ></textarea>
        </div>

        <button type="submit" class="submit-btn">发送消息</button>
      </form>
    </div>

    <div class="contact-info">
      <h2>其他联系方式</h2>
      <div class="info-grid">
        <div class="info-item">
          <h3>📧 邮箱</h3>
          <p>contact@example.com</p>
        </div>
        <div class="info-item">
          <h3>📱 电话</h3>
          <p>+86 123-4567-8901</p>
        </div>
        <div class="info-item">
          <h3>📍 地址</h3>
          <p>北京市朝阳区示例街道123号</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

console.log('Contact组件已加载');

const form = reactive({
  name: '',
  email: '',
  message: '',
});

const submitForm = () => {
  console.log('表单提交:', form);
  alert(`感谢您的消息，${form.name}！我们会尽快回复您。`);

  // 重置表单
  form.name = '';
  form.email = '';
  form.message = '';
};
</script>

<style scoped>
.contact {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
}

.contact-form {
  background: #f9f9f9;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 3rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #42b883;
}

.submit-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background: #369870;
}

.contact-info h2 {
  color: #42b883;
  margin-bottom: 1.5rem;
  text-align: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.info-item {
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-item h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.info-item p {
  color: #666;
}
</style>
