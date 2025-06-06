/// <reference types="vite/client" />

// 全局环境变量定义
declare const __MODE__: string;
declare const __THEME__: string;
declare const __VERSION__: string;
declare const __TEST_VAR__: string;

declare const PAGE_NAME: string;
declare const IS_MOBILE: boolean;
declare const IS_TABLET: boolean;
declare const IS_DEFAULT: boolean;

// Vue 组件类型声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
