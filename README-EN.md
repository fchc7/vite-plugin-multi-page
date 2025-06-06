# vite-plugin-multi-page

> 中文文档 | [中文文档](./README.md)

A powerful Vite plugin for building multi-page applications with smart file routing and multi-strategy builds.

## Features

- 🎯 **Multi-page support**: Automatically discover page entry files
- 🔧 **Multi-strategy builds**: Support configuring different build strategies for different pages
- 📝 **TypeScript configuration**: Support TypeScript configuration files
- 🚀 **CLI tool**: Provide a command-line batch build tool
- 🔄 **Hot reload**: Development server supports page hot reload
- 📦 **Smart merge**: Automatically merge multi-strategy build results

## Installation

```bash
npm install vite-plugin-multi-page --save-dev
```

## Quick Start

### 1. Create a configuration file

Create a `multipage.config.ts` or `multipage.config.js`:

```typescript
export default context => {
  const { mode, command, isCLI } = context;
  const isProduction = mode === 'production';

  return {
    // Page entry matching rule
    entry: 'src/pages/**/*.{ts,js}',

    // HTML template
    template: 'index.html',

    // Template placeholder
    placeholder: '{{ENTRY_FILE}}',

    // Excluded files
    exclude: ['src/shared/**/*.ts'],

    // Debug mode
    debug: !isProduction || isCLI,

    // Build strategy
    strategies: {
      default: {
        define: {
          IS_DEFAULT: true,
          API_BASE: isProduction ? '"https://api.example.com"' : '"http://localhost:3001/api"',
        },
        build: {
          sourcemap: !isProduction,
          minify: isProduction ? 'esbuild' : false,
        },
      },

      mobile: {
        define: {
          IS_MOBILE: true,
          API_BASE: isProduction
            ? '"https://mobile-api.example.com"'
            : '"http://localhost:3001/mobile-api"',
        },
        build: {
          target: ['es2015', 'chrome58', 'safari11'],
          minify: isProduction ? 'terser' : false,
        },
      },
    },

    // Page configuration function
    pageConfigs: context => {
      // Determine the application strategy based on the file path
      if (context.relativePath.includes('/mobile/')) {
        return {
          strategy: 'mobile',
          define: {
            PAGE_NAME: context.pageName,
            MOBILE_PAGE: true,
          },
        };
      }

      // Default strategy
      return {
        strategy: 'default',
        define: {
          PAGE_NAME: context.pageName,
          DEFAULT_PAGE: true,
        },
      };
    },
  };
};
```

### 2. Configure Vite

Add the plugin in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import viteMultiPage from 'vite-plugin-multi-page';

export default defineConfig({
  plugins: [viteMultiPage()],
});
```

### 3. Create page files

Create page files according to the convention:

```
src/pages/
├── home.js                    # → /home.html
├── about.js                   # → /about.html
├── mobile/
│   └── main.ts               # → /mobile.html (mobile strategy)
└── admin/
    └── main.ts               # → /admin.html
```

## Page discovery rules

The plugin discovers page entries according to the following rules:

1. **First-level files** (priority 1): `src/pages/home.js` → `/home.html`
2. **Directory main files** (priority 2): `src/pages/mobile/main.ts` → `/mobile.html`

**Directory priority rule**: If both `src/pages/about.js` and `src/pages/about/main.ts` exist, `src/pages/about/main.ts` will be used.

## Build strategies

### Strategy configuration

策略配置支持所有 Vite 配置选项:

```typescript
strategies: {
  mobile: {
    define: {
      IS_MOBILE: true,
    },
    build: {
      target: ['es2015'],
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
    },
    // Other Vite configurations...
  },
}
```

### Page strategy assignment

Assign strategies to pages through the `pageConfigs` function:

```typescript
pageConfigs: context => {
  const { pageName, relativePath } = context;

  if (relativePath.includes('/mobile/')) {
    return { strategy: 'mobile' };
  }

  if (pageName.startsWith('admin')) {
    return { strategy: 'admin' };
  }

  return { strategy: 'default' };
};
```

## 命令行工具

### 批量构建

```bash
# Build all strategies
npx vite-mp

# Pass additional Vite parameters
npx vite-mp --host --port 3000

# Enable debug mode
npx vite-mp --debug
```

### 开发服务器

```bash
# Start development server (all pages)
npm run dev

# Only display pages with specific strategies
npm run dev -- --strategy mobile
```

## Environment variables

- `VITE_BUILD_STRATEGY`: Specify a single strategy build
- `IS_MOBILE`: Mobile identifier (configured in define)
- `API_BASE`: API base address (configured in define)

## TypeScript support

The plugin fully supports TypeScript configuration files:

```typescript
// multipage.config.ts
import type { ConfigFunction } from 'vite-plugin-multi-page';

const config: ConfigFunction = context => {
  return {
    entry: 'src/pages/**/*.{ts,js}',
    // ... other configurations
  };
};

export default config;
```

## API reference

### Configuration options

| Option        | Type                       | Default                    | Description                  |
| ------------- | -------------------------- | -------------------------- | ---------------------------- |
| `entry`       | `string`                   | `'src/pages/**/*.{ts,js}'` | Page entry matching rule     |
| `template`    | `string`                   | `'index.html'`             | HTML template file           |
| `placeholder` | `string`                   | `'{{ENTRY_FILE}}'`         | Template placeholder         |
| `exclude`     | `string[]`                 | `[]`                       | Excluded file patterns       |
| `debug`       | `boolean`                  | `false`                    | Enable debug log             |
| `strategies`  | `Record<string, Strategy>` | `{}`                       | Build strategy configuration |
| `pageConfigs` | `Function \| Object`       | `{}`                       | Page                         |

### Utility functions

```typescript
import { defineConfig, defineConfigTransform } from 'vite-plugin-multi-page';

// Define configuration
export default defineConfig(context => ({
  // Configuration options
}));

// Configuration transformation
const transform = defineConfigTransform((config, context) => {
  // Modify configuration
  return config;
});
```

## Example project

See [example](./example) directory for a complete example project.

## License

MIT License
