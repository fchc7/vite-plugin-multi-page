# @fchc8/vite-plugin-multi-page

> 中文文档 | [中文文档](./README.md)

A powerful Vite plugin for multi-page application development, providing multi-strategy builds, TypeScript configuration support, and command-line tools.

## Features

- 🎯 **Multi-page support**: Automatically discover page entry files
- 🔧 **Multi-strategy builds**: Support configuring different builds for different pages
- 📝 **TypeScript configuration**: Support TypeScript configuration files
- 🚀 **CLI tool**: Provide command-line batch build tools
- 🔄 **Hot reload**: Development server supports page hot reload
- 📦 **Smart merge**: Automatically merge multi-strategy build results

## Install

```bash
npm install @fchc8/vite-plugin-multi-page --save-dev
```

## Quick Start

### 1. Configure Vite

Add the plugin in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { viteMultiPage } from '@fchc8/vite-plugin-multi-page';

export default defineConfig({
  plugins: [viteMultiPage()],
});
```

### 2. Create Configuration File (Optional)

The plugin provides reasonable default configurations, you can choose:

**Option A: No Configuration File (Use Default Configuration)**

- Automatically scan for page files under `src/pages/**/*.{ts,js}`, and the file with the name main as the page entry
- Use `index.html` as the template
- Create default build strategy

**Option B: Simplest Configuration**

Create `multipage.config.ts`:

```typescript
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

// Use all default values
export default defineConfig(() => ({}));
```

**Option C: Complete Configuration**

Create `multipage.config.ts` or `multipage.config.js`:

```typescript
import { defineConfig } from 'vite-plugin-multi-page';

// Method 1: Object Configuration (Recommended)
export default defineConfig({
  entry: 'src/pages/**/*.{ts,js}',
  template: 'index.html',
  strategies: {
    // Strategy Configuration...
  },
});

// Method 2: Function Configuration (Dynamic Configuration)
export default defineConfig(context => {
  const { mode, command, isCLI } = context;
  const isProduction = mode === 'production';

  return {
    // Page entry matching rules
    entry: 'src/pages/**/*.{ts,js}',

    // HTML Template
    template: 'index.html',

    // Template Placeholder
    placeholder: '{{ENTRY_FILE}}',

    // Excluded Files
    exclude: ['src/shared/**/*.ts'],

    // Debug Mode
    debug: !isProduction || isCLI,

    // Build Strategy
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

    // Page Configuration Function
    pageConfigs: context => {
      // Determine the strategy based on the file path
      if (context.relativePath.includes('/mobile/')) {
        return {
          strategy: 'mobile',
          define: {
            PAGE_NAME: context.pageName,
            MOBILE_PAGE: true,
          },
        };
      }

      // Default Strategy
      return {
        strategy: 'default',
        define: {
          PAGE_NAME: context.pageName,
          DEFAULT_PAGE: true,
        },
      };
    },
  };
});
```

### 3. Create Page Files

Create page files according to the convention:

**Note**: Even if you use the empty configuration `defineConfig({})`, the plugin will automatically use the default strategy to process all pages, ensuring maximum compatibility.

```
src/pages/
├── home.js                    # → /home.html
├── about.js                   # → /about.html (Default Strategy)
├── mobile/
│   └── main.ts               # → /mobile.html (Mobile Strategy)
└── admin/
    └── main.ts               # → /admin.html (Admin Strategy)
```

## Page Discovery Rules

The plugin discovers page entries according to the following rules:

1. **First-level Files** (Priority 1): `src/pages/home.js` → `/home.html`
2. **Directory main files** (Priority 2): `src/pages/mobile/main.ts` → `/mobile.html`

**Directory Priority Principle**: If both `src/pages/about.js` and `src/pages/about/main.ts` exist, `src/pages/about/main.ts` will be used.

## Build Strategy

### Strategy Configuration

Strategy configuration supports all Vite configuration options:

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

### Build Output Merge Strategy

Control how build outputs are organized using the `merge` option:

```typescript
export default defineConfig({
  // ... other configurations
  merge: 'all' | 'page',
});
```

#### Available Modes

- **`all`** (default): All HTML files in root directory, assets merged into `/dist/assets/`

  ```
  dist/
  ├── home.html
  ├── about.html
  ├── mobile.html
  └── assets/
      ├── home-xxx.js
      ├── about-xxx.js
      └── shared-resource.svg
  ```

- **`page`**: Each page is independently packaged with its own complete set of resource copies
  ```
  dist/
  ├── home/
  │   ├── index.html
  │   ├── assets/
  │   │   ├── home-xxx.js
  │   │   └── button-loading.svg
  │   └── images/
  ├── about/
  │   ├── index.html
  │   ├── assets/
  │   │   ├── about-xxx.js
  │   │   └── button-loading.svg
  │   └── images/
  └── mobile/
      ├── index.html
      ├── assets/
      │   ├── mobile-xxx.js
      │   └── button-loading.svg
      └── images/
  ```

#### Advantages of Page Mode

- ✅ **Fully Independent**: Each page directory contains all required resources, can be deployed independently
- ✅ **Avoid Conflicts**: Completely resolves shared resource attribution issues
- ✅ **Clean Naming**: Resource files use clean file names without page prefixes
- ✅ **Deployment Friendly**: Supports CDN distribution, micro-frontend architectures

> **Note**:
>
> - Page mode creates resource copies for each page, which may increase overall build output size
> - Suitable for scenarios requiring independent deployment or strict resource isolation
> - Static assets from the `public/` directory are automatically copied to each page directory

### Page Strategy Assignment

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

## Command Line Tool

### Batch Build

```bash
# Build all strategies
npx vite-mp

# Pass additional Vite parameters
npx vite-mp --host --port 3000

# Enable debug mode
npx vite-mp --debug
```

### Development Server

```bash
# Start development server (all pages)
npm run dev

# Only display pages with specific strategies
npm run dev -- --strategy mobile
```

## Usage Examples

### Page Mode for Independent Deployment

Configure Page mode where each page gets complete independent resources:

```typescript
// multipage.config.ts
export default defineConfig({
  entry: 'src/pages/**/*.{ts,js}',
  template: 'index.html',
  merge: 'page', // Enable Page mode
  strategies: {
    default: {
      build: {
        sourcemap: false,
        minify: 'esbuild',
      },
    },
    mobile: {
      build: {
        target: ['es2015'],
        minify: 'terser',
      },
    },
  },
  pageConfigs: context => {
    if (context.relativePath.includes('/mobile/')) {
      return { strategy: 'mobile' };
    }
    return { strategy: 'default' };
  },
});
```

Build result: Each page has independent resource files, avoiding shared resource missing issues.

### Shared Resource Handling

In Page mode, shared resources (such as icons, style files) are copied to each page directory:

```typescript
// src/pages/about/main.ts
import buttonIcon from '../button-loading.svg'; // Shared resource

// src/pages/mobile/main.ts
import buttonIcon from '../button-loading.svg'; // Same shared resource
```

After building, both pages will have their own resource copies:

- `dist/about/assets/button-loading-xxx.svg`
- `dist/mobile/assets/button-loading-xxx.svg`

## Environment Variables

- `VITE_BUILD_STRATEGY`: Specify a single strategy build
- `VITE_MULTI_PAGE_BUILD_SINGLE_PAGE`: Specify single page build (used internally by Page mode)
- `IS_MOBILE`: Mobile identifier (configured in define)
- `API_BASE`: API base address (configured in define)

## TypeScript Support

The plugin fully supports TypeScript configuration files:

```typescript
// multipage.config.ts
import type { ConfigFunction } from '@fchc8/vite-plugin-multi-page';

const config: ConfigFunction = context => {
  return {
    entry: 'src/pages/**/*.{ts,js}',
    // ... other configurations
  };
};

export default config;
```

## API Reference

### Configuration Options

| Option        | Type                       | Default Value              | Description                  |
| ------------- | -------------------------- | -------------------------- | ---------------------------- |
| `entry`       | `string`                   | `'src/pages/**/*.{ts,js}'` | Page entry matching rules    |
| `template`    | `string`                   | `'index.html'`             | HTML Template File           |
| `placeholder` | `string`                   | `'{{ENTRY_FILE}}'`         | Template placeholder         |
| `exclude`     | `string[]`                 | `[]`                       | Excluded file patterns       |
| `debug`       | `boolean`                  | `false`                    | Enable debug logging         |
| `merge`       | `'all' \| 'page'`          | `'all'`                    | Build output merge strategy  |
| `strategies`  | `Record<string, Strategy>` | `{}`                       | Build strategy configuration |
| `pageConfigs` | `Function \| Object`       | `{}`                       | Page configuration           |

### Utility Functions

```typescript
import { defineConfig, defineConfigTransform } from '@fchc8/vite-plugin-multi-page';

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

## Example Project

See [example](./example) directory for the complete example project.

## License

MIT License
