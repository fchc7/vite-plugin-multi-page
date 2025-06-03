# vite-plugin-multi-page

> English Documentation | [中文文档](./README.md)

A powerful Vite plugin for building multi-page applications with smart file routing and multiple build strategies.

## ✨ Features

- 🚀 **Automatic Page Discovery**: Automatically scan and configure entry pages based on file patterns
- 🎯 **Multiple Build Strategies**: Configure different build options and optimization strategies for different pages
- 🧩 **Flexible Configuration**: Support object configuration, function configuration, and pattern matching
- 📱 **Responsive Templates**: Different pages can use different HTML templates
- 🔧 **Full Vite Integration**: Inherit all Vite configuration options
- 🌍 **Environment Variables Support**: Page-level and strategy-level environment variable definitions
- 🎨 **Developer Friendly**: Detailed debug logs and hot reload support

## 📦 Installation

```bash
npm install @fchc8/vite-plugin-multi-page
# or
yarn add @fchc8/vite-plugin-multi-page
# or
pnpm add @fchc8/vite-plugin-multi-page
```

## 🚀 Quick Start

### Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import viteMultiPage from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      template: 'index.html',
      exclude: ['src/main.ts'],
      debug: true,
    }),
  ],
});
```

### Project Structure Example

```
project/
├── src/
│   └── pages/
│       ├── home.ts          → /home.html
│       ├── about.ts         → /about.html
│       ├── admin/
│       │   └── dashboard.ts → /dashboard.html
│       └── mobile/
│           └── app.js       → /app.html
├── index.html
├── admin.html
└── mobile.html
```

## 🎯 Advanced Configuration

### Advanced Configuration

```typescript
import { defineConfig } from 'vite';
import viteMultiPage from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      template: 'index.html',

      // Define configuration strategies
      configStrategies: {
        // Modern browser strategy
        default: {
          define: {
            'process.env.BUILD_TYPE': '"modern"',
          },
          build: {
            target: 'es2015',
            minify: 'esbuild',
            sourcemap: true,
            rollupOptions: {
              output: {
                format: 'es',
                entryFileNames: 'assets/[name]-[hash].js',
              },
            },
          },
        },

        // Legacy browser compatibility
        legacy: {
          define: {
            'process.env.BUILD_TYPE': '"legacy"',
          },
          build: {
            target: 'es5',
            minify: 'terser',
            sourcemap: false,
            rollupOptions: {
              output: {
                format: 'iife',
                entryFileNames: 'legacy/[name].js',
              },
            },
          },
        },

        // Mobile optimization
        mobile: {
          define: {
            __MOBILE__: 'true',
            __THEME__: '"dark"',
          },
          css: {
            devSourcemap: true,
          },
          optimizeDeps: {
            include: ['mobile-utils'],
          },
        },
      },

      // Page-specific configurations
      pageConfigs: {
        // Using match patterns
        'admin-pages': {
          match: ['admin*', '**/admin/**'],
          strategy: 'default',
          template: 'admin.html',
        },

        // Mobile pages
        'mobile-app': {
          match: '**/mobile/**',
          strategy: 'mobile',
          template: 'mobile.html',
          define: {
            __PAGE_TYPE__: '"app"',
          },
        },
      },
    }),
  ],
});
```

## 📋 Configuration Options

### MultiPageOptions

| Option            | Type                                               | Default                                | Description                 |
| ----------------- | -------------------------------------------------- | -------------------------------------- | --------------------------- |
| `entry`           | `string`                                           | `"src/**/*.{ts,js}"`                   | Entry file matching pattern |
| `template`        | `string`                                           | `"index.html"`                         | Default HTML template       |
| `exclude`         | `string[]`                                         | `["src/main.ts", "src/vite-env.d.ts"]` | Files to exclude            |
| `placeholder`     | `string`                                           | `"{{ENTRY_FILE}}"`                     | Placeholder in template     |
| `debug`           | `boolean`                                          | `false`                                | Enable debug logs           |
| `buildStrategies` | `Record<string, BuildStrategy>`                    | `{}`                                   | Build strategy definitions  |
| `pageConfigs`     | `Record<string, PageConfig> \| PageConfigFunction` | `{}`                                   | Page configurations         |

### BuildStrategy

```typescript
// Configuration Strategy - Simplified, directly extends Vite config
interface ConfigStrategy extends Omit<UserConfig, 'plugins'> {
  // Uses Vite's standard configuration structure
  // For example:
  // - define: Environment variables
  // - build: Build configuration
  // - css: CSS configuration
  // - server: Server configuration
  // - optimizeDeps: Dependency optimization
  // etc...
}
```

> **Note**: The configuration strategy interface has been simplified to directly extend Vite's `UserConfig`. This allows you to use Vite's standard configuration structure without additional nesting. The functionality of the previous `output` property can now be achieved using `build.rollupOptions.output`.

### PageConfig

```typescript
interface PageConfig {
  strategy?: string; // Specifies which configuration strategy to use
  template?: string; // Specifies which HTML template to use
  define?: Record<string, any>; // Page-level environment variables
  match?: string | string[]; // Used for pattern matching
}
```

> **Note**: The PageConfig interface has been simplified to only include core properties that are actually used. Unused properties like `exclude`, `alias`, and `build` have been removed, making the interface cleaner and more focused.

## 🌟 Use Cases

### 1. Enterprise Multi-Page Application

```typescript
configStrategies: {
  admin: {
    define: { 'process.env.APP_TYPE': '"admin"' },
    build: {
      target: 'es2015',
      sourcemap: true
    }
  },

  public: {
    define: { 'process.env.APP_TYPE': '"public"' },
    build: {
      target: 'es5',
      minify: 'terser'
    }
  }
}
```

### 2. Mobile Optimization

```typescript
configStrategies: {
  mobile: {
    css: { devSourcemap: true },
    optimizeDeps: { include: ['@mobile/utils'] },
    build: {
      target: 'es2018',
      chunkSizeWarningLimit: 300,
      cssCodeSplit: true
    }
  }
}
```

### 3. Component Library Development

```typescript
configStrategies: {
  library: {
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'MyLibrary',
        formats: ['es', 'umd']
      },
      minify: false,
      sourcemap: true
    }
  }
}
```

## 📱 Example Project

Check the `example/` directory for a complete example project including:

- Admin dashboard (modern syntax)
- Mobile application (compatible syntax)
- Component library documentation
- Different HTML templates
- Function configuration examples

### Quick Start

```bash
# Method 1: Use setup script (recommended)
./setup-example.sh

# Method 2: Manual setup
npm run build          # Build the plugin first
cd example
npm install            # Install example dependencies
npm run dev            # Run development server

# Method 3: Use root scripts
npm run example:dev     # Development mode
npm run example:build   # Build
npm run example:preview # Preview build results
```

### Example Pages

After building, visit these pages:

- `/home.html` - Home page (default strategy)
- `/about.html` - About page (default strategy)
- `/dashboard.html` - Admin dashboard (modern ES syntax + dedicated template)
- `/app.html` - Mobile app (ES5 compatible syntax + mobile template)
- `/index.html` - Component library docs (library mode + docs template)

## 🔧 Development

```bash
# Clone the project
git clone https://github.com/fchc7/vite-plugin-multi-page.git
cd vite-plugin-multi-page

# Install dependencies
pnpm install

# Development mode
pnpm dev

# Type checking
pnpm type-check

# Code formatting
pnpm format

# Code linting
pnpm lint

# Build
pnpm build
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

## 🔗 Related Links

- [Vite Official Documentation](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
