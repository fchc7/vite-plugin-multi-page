# @fchc8/vite-plugin-multi-page

> 中文文档 | [中文文档](./README.md)

A powerful Vite plugin for multi-page application development, providing multi-strategy builds, TypeScript configuration support, and command-line tools.

## Features

- 🎯 **Multi-page support**: Automatically discover page entry files
- 🔧 **Multi-strategy builds**: Support configuring different builds for different pages
- 📝 **TypeScript configuration**: Support TypeScript configuration files
- 🚀 **CLI tool**: Provide command-line batch build tools
- 🔄 **Hot reload**: Development server supports page hot reload
- 📦 **Flattened output**: Support flattened build results to reduce directory levels
- ⚡ **Concurrent builds**: Support controlling concurrent build count to improve build efficiency
- 🗂️ **Resource deduplication**: Automatically deduplicate shared resources to reduce build output size

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
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

export default defineConfig(context => {
  const { mode } = context;
  const isProduction = mode === 'production';

  return {
    // Page entry matching rules
    entry: 'src/pages/**/*.{ts,js}',

    // HTML Template
    template: 'index.html',

    // Excluded Files
    exclude: ['src/shared/**/*.ts'],

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
      if (context.relativePath.includes('/mobile/')) {
        return { strategy: 'mobile' };
      }
      return { strategy: 'default' };
    },
  };
});
```

### 3. Create Page Files

Create page files according to the convention:

```
src/pages/
├── home.js                    # → /home.html
├── about.js                   # → /about.html
├── mobile/
│   └── main.ts               # → /mobile.html (Mobile Strategy)
└── admin/
    └── main.ts               # → /admin.html
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

### Build Output Organization Strategy

#### Strategy Grouping Mode (Default)

By default, build results are grouped by strategy:

```
dist/
├── default/
│   ├── home.html
│   ├── about.html
│   ├── assets/
│   │   ├── home-xxx.js
│   │   ├── about-xxx.js
│   │   └── shared-resource.svg
│   └── images/
├── mobile/
│   ├── mobile.html
│   ├── assets/
│   │   ├── mobile-xxx.js
│   │   └── button-loading.svg
│   └── images/
└── tablet/
    ├── tablet.html
    ├── assets/
    │   ├── tablet-xxx.js
    │   └── button-loading.svg
    └── images/
```

#### Flattened Mode (Default)

Flattened output is enabled by default. Use the `--no-flatten` parameter to disable it:

```bash
# Default behavior (flattened output)
npx vite-mp

# Disable flattened output
npx vite-mp --no-flatten
```

Flattened structure:

```
dist/
├── home.html
├── about.html
├── mobile.html
├── tablet.html
├── assets/
│   ├── home-xxx.js
│   ├── about-xxx.js
│   ├── mobile-xxx.js
│   ├── tablet-xxx.js
│   └── shared-resource.svg
├── images/
├── favicon.ico
└── some.css
```

#### Advantages of Flattened Mode

- ✅ **Simplified Deployment**: All files in root directory, easier deployment
- ✅ **Resource Deduplication**: Automatically deduplicate identical resource files
- ✅ **Reduced Hierarchy**: Avoid deeply nested directory structures
- ✅ **Unified Management**: All resources centrally managed, easy CDN configuration

### Concurrent Build Control

Control concurrent build count through the `--concurrency` parameter:

```bash
# Default concurrency is 3
npx vite-mp

# Set concurrency to 1 (serial build)
npx vite-mp --concurrency 1

# Set concurrency to 5 (high concurrency)
npx vite-mp --concurrency 5
```

#### Advantages of Concurrent Builds

- ⚡ **Improved Efficiency**: Multi-strategy parallel builds, reduce total build time
- 🔧 **Resource Control**: Avoid overloading system resources with too many concurrent builds
- 🎯 **Flexible Configuration**: Adjust concurrency based on machine performance
- 📊 **Progress Visibility**: Debug mode shows batch build progress

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
# Build all strategies (default flattened output)
npx vite-mp

# Disable flattened output structure
npx vite-mp --no-flatten

# Control concurrent build count
npx vite-mp --concurrency 2

# Build specified strategies
npx vite-mp --strategy mobile,tablet

# Pass additional Vite parameters
npx vite-mp --host --port 3000

# Enable debug mode
npx vite-mp --debug

# Combined usage
npx vite-mp --concurrency 4 --debug
```

### Development Server

```bash
# Start development server (all pages)
npm run dev

# Only display pages with specific strategies
npm run dev -- --strategy mobile
```

### Static Resource Preview

After building, you can preview static resources in multiple ways:

```bash
# Using serve tool (recommended)
npx serve dist -p 3000

# Using http-server
npx http-server dist -p 3000

# Using Python simple server
python -m http.server 3000 --directory dist

# Using Node.js simple server
npx http-server dist
```

Access URLs:

- Default (flattened mode): `http://localhost:3000/home.html`
- Strategy grouping mode: `http://localhost:3000/default/home.html` (use `--no-flatten`)

## Usage Examples

### Default Flattened Build

The plugin uses flattened output by default for multi-strategy applications:

```bash
# Default flattened build, all files in root directory
npx vite-mp

# High concurrency flattened build
npx vite-mp --concurrency 5

# Only build mobile and tablet strategies (flattened by default)
npx vite-mp --strategy mobile,tablet
```

Build result:

```
dist/
├── home.html          # Default strategy page
├── about.html         # Default strategy page
├── mobile.html        # Mobile strategy page
├── tablet.html        # Tablet strategy page
├── assets/            # Unified resource directory
│   ├── home-xxx.js
│   ├── about-xxx.js
│   ├── mobile-xxx.js
│   ├── tablet-xxx.js
│   └── shared-resource.svg
├── images/
├── favicon.ico
└── some.css
```

### Concurrent Build Optimization

Adjust concurrency based on machine performance:

```bash
# Low-spec machine: serial build
npx vite-mp --concurrency 1

# High-spec machine: high concurrency build
npx vite-mp --concurrency 8

# Debug mode to view build progress
npx vite-mp --concurrency 4 --debug
```

### Production Environment Deployment

```bash
# Production environment build (flattened by default)
npx vite-mp --concurrency 4

# After building, can be directly deployed to CDN
# All resources are in root directory, easy CDN configuration
```

## Environment Variables

- `VITE_MULTI_PAGE_STRATEGY`: Current build strategy (automatically set)
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
| `strategies`  | `Record<string, Strategy>` | `{}`                       | Build strategy configuration |
| `pageConfigs` | `Function \| Object`       | `{}`                       | Page configuration           |

### CLI Parameters

| Parameter       | Type      | Default Value | Description                                           |
| --------------- | --------- | ------------- | ----------------------------------------------------- |
| `--flatten`     | `boolean` | `true`        | Enable flattened output structure (default)           |
| `--no-flatten`  | `boolean` | `false`       | Disable flattened output structure                    |
| `--concurrency` | `number`  | `3`           | Concurrent build count                                |
| `--strategy`    | `string`  | -             | Specify build strategies (can be used multiple times) |
| `--debug`       | `boolean` | `false`       | Enable debug mode                                     |
| `--cwd`         | `string`  | -             | Specify working directory                             |
| `--help`        | `boolean` | `false`       | Show help information                                 |

### Utility Functions

```typescript
import { defineConfig } from '@fchc8/vite-plugin-multi-page';

// Define configuration
export default defineConfig(context => ({
  // Configuration options
}));
```

## Example Project

See [example](./example) directory for the complete example project.

## License

MIT License
