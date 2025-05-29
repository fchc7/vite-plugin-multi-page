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
npm install vite-plugin-multi-page
# or
yarn add vite-plugin-multi-page
# or
pnpm add vite-plugin-multi-page
```

## 🚀 Quick Start

### Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import viteMultiPage from 'vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      template: 'index.html',
      exclude: ['src/main.ts'],
      debug: true
    })
  ]
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

### Multiple Build Strategies

```typescript
import { defineConfig } from 'vite';
import viteMultiPage from 'vite-plugin-multi-page';

export default defineConfig({
  plugins: [
    viteMultiPage({
      entry: 'src/pages/**/*.{ts,js}',
      
      // Define build strategies
      buildStrategies: {
        // Modern browser strategy
        default: {
          viteConfig: {
            define: {
              'process.env.BUILD_TYPE': '"modern"'
            }
          },
          output: {
            format: 'es',
            entryFileNames: 'assets/[name]-[hash].js'
          },
          build: {
            target: 'es2015',
            minify: 'esbuild',
            sourcemap: true
          }
        },
        
        // Legacy compatibility strategy
        legacy: {
          viteConfig: {
            define: {
              'process.env.BUILD_TYPE': '"legacy"'
            }
          },
          output: {
            format: 'iife',
            entryFileNames: 'legacy/[name].js'
          },
          build: {
            target: 'es5',
            minify: 'terser',
            sourcemap: false
          }
        },
        
        // Mobile optimization strategy
        mobile: {
          viteConfig: {
            css: {
              devSourcemap: true
            },
            optimizeDeps: {
              include: ['mobile-utils']
            }
          },
          build: {
            target: 'es2018',
            chunkSizeWarningLimit: 300
          }
        }
      }
    })
  ]
});
```

### Function Configuration

```typescript
viteMultiPage({
  entry: 'src/pages/**/*.{ts,js}',
  
  // Use function for dynamic configuration
  pageConfigs: (context) => {
    const { pageName, filePath, relativePath } = context;
    
    // Admin pages
    if (pageName.startsWith('admin')) {
      return {
        strategy: 'default',
        template: 'admin.html',
        define: {
          'process.env.API_BASE': '"https://admin-api.example.com"'
        }
      };
    }
    
    // Mobile pages
    if (relativePath.includes('/mobile/')) {
      return {
        strategy: 'mobile',
        template: 'mobile.html',
        define: {
          'process.env.API_BASE': '"https://mobile-api.example.com"'
        }
      };
    }
    
    // Default configuration
    return {
      strategy: 'default'
    };
  }
})
```

### Object Configuration with Pattern Matching

```typescript
viteMultiPage({
  entry: 'src/pages/**/*.{ts,js}',
  
  pageConfigs: {
    // Exact match
    'home': {
      strategy: 'default',
      template: 'home.html'
    },
    
    // Wildcard match
    'admin*': {
      strategy: 'default',
      template: 'admin.html'
    },
    
    // Pattern match
    'mobile-app': {
      strategy: 'mobile',
      match: ['**/mobile/**', '*mobile*'],
      template: 'mobile.html'
    }
  }
})
```

## 📋 Configuration Options

### MultiPageOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string` | `"src/**/*.{ts,js}"` | Entry file matching pattern |
| `template` | `string` | `"index.html"` | Default HTML template |
| `exclude` | `string[]` | `["src/main.ts", "src/vite-env.d.ts"]` | Files to exclude |
| `placeholder` | `string` | `"{{ENTRY_FILE}}"` | Placeholder in template |
| `debug` | `boolean` | `false` | Enable debug logs |
| `buildStrategies` | `Record<string, BuildStrategy>` | `{}` | Build strategy definitions |
| `pageConfigs` | `Record<string, PageConfig> \| PageConfigFunction` | `{}` | Page configurations |

### BuildStrategy

```typescript
interface BuildStrategy {
  // Full Vite configuration support
  viteConfig?: Omit<UserConfig, 'plugins' | 'build'> & {
    build?: BuildOptions;
  };
  
  // Output configuration
  output?: {
    format?: 'es' | 'cjs' | 'umd' | 'iife';
    dir?: string;
    entryFileNames?: string;
    chunkFileNames?: string;
    assetFileNames?: string;
    globals?: Record<string, string>;
    external?: string | string[] | ((id: string) => boolean);
  };
  
  // Build configuration
  build?: {
    target?: string | string[];
    minify?: boolean | 'terser' | 'esbuild';
    sourcemap?: boolean | 'inline' | 'hidden';
    lib?: boolean | LibraryOptions;
    cssCodeSplit?: boolean;
    cssTarget?: string | string[];
    rollupOptions?: any;
    // ... more Vite build options
  };
  
  // Environment variables
  define?: Record<string, any>;
  
  // Alias configuration
  alias?: Record<string, string>;
  
  // Server configuration
  server?: ServerOptions;
  
  // CSS configuration
  css?: CSSOptions;
  
  // Dependency optimization
  optimizeDeps?: DepOptimizationOptions;
}
```

### PageConfig

```typescript
interface PageConfig {
  strategy?: string;           // Build strategy to use
  template?: string;           // Page template
  exclude?: string[];          // Exclude rules
  define?: Record<string, any>; // Environment variables
  alias?: Record<string, string>; // Aliases
  build?: Partial<BuildStrategy['build']>; // Build configuration
  match?: string | string[];   // Match patterns
}
```

## 🌟 Use Cases

### 1. Enterprise Multi-Page Application

```typescript
buildStrategies: {
  admin: {
    viteConfig: {
      define: { 'process.env.APP_TYPE': '"admin"' }
    },
    build: {
      target: 'es2015',
      sourcemap: true
    }
  },
  
  public: {
    viteConfig: {
      define: { 'process.env.APP_TYPE': '"public"' }
    },
    build: {
      target: 'es5',
      minify: 'terser'
    }
  }
}
```

### 2. Mobile Optimization

```typescript
buildStrategies: {
  mobile: {
    viteConfig: {
      css: { devSourcemap: true },
      optimizeDeps: { include: ['@mobile/utils'] }
    },
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
buildStrategies: {
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
git clone <repository-url>
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