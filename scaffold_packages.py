import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

# 1. turbo.json
turbo_config = {
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": False,
      "persistent": True
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
with open(os.path.join(base_dir, "turbo.json"), "w") as f:
    json.dump(turbo_config, f, indent=2)

packages_dir = os.path.join(base_dir, "packages")
os.makedirs(packages_dir, exist_ok=True)

# 2. packages/tsconfig
tsconfig_dir = os.path.join(packages_dir, "tsconfig")
os.makedirs(tsconfig_dir, exist_ok=True)

with open(os.path.join(tsconfig_dir, "package.json"), "w") as f:
    json.dump({
      "name": "@nexus/tsconfig",
      "version": "0.1.0",
      "private": True
    }, f, indent=2)

with open(os.path.join(tsconfig_dir, "base.json"), "w") as f:
    json.dump({
      "$schema": "https://json.schemastore.org/tsconfig",
      "display": "Default",
      "compilerOptions": {
        "declaration": True,
        "declarationMap": True,
        "esModuleInterop": True,
        "incremental": False,
        "isolatedModules": True,
        "lib": ["es2022", "DOM", "DOM.Iterable"],
        "module": "NodeNext",
        "moduleDetection": "force",
        "moduleResolution": "NodeNext",
        "noUncheckedIndexedAccess": True,
        "resolveJsonModule": True,
        "skipLibCheck": True,
        "strict": True,
        "target": "es2022"
      }
    }, f, indent=2)

with open(os.path.join(tsconfig_dir, "nextjs.json"), "w") as f:
    json.dump({
      "$schema": "https://json.schemastore.org/tsconfig",
      "display": "Next.js",
      "extends": "./base.json",
      "compilerOptions": {
        "plugins": [{"name": "next"}],
        "allowJs": True,
        "declaration": False,
        "declarationMap": False,
        "incremental": True,
        "jsx": "preserve",
        "lib": ["dom", "dom.iterable", "esnext"],
        "module": "esnext",
        "noEmit": True,
        "resolveJsonModule": True,
        "strict": True,
        "target": "es5"
      }
    }, f, indent=2)

# 3. packages/eslint-config
eslint_dir = os.path.join(packages_dir, "eslint-config")
os.makedirs(eslint_dir, exist_ok=True)

with open(os.path.join(eslint_dir, "package.json"), "w") as f:
    json.dump({
      "name": "@nexus/eslint-config",
      "version": "0.1.0",
      "private": True,
      "dependencies": {
        "eslint": "^8",
        "eslint-config-next": "latest",
        "eslint-config-prettier": "^9.1.0",
        "eslint-plugin-react": "^7.34.1"
      }
    }, f, indent=2)

with open(os.path.join(eslint_dir, "next.js"), "w") as f:
    f.write("""const { resolve } = require("node:path");
const project = resolve(process.cwd(), "tsconfig.json");

module.exports = {
  extends: [
    "eslint:recommended",
    "prettier",
    "require-of/next",
    "turbo"
  ],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    browser: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    ".*.js",
    "node_modules/",
  ],
  overrides: [{ files: ["*.js?(x)", "*.ts?(x)"] }],
};
""")

# 4. packages/design-tokens
tokens_dir = os.path.join(packages_dir, "design-tokens")
os.makedirs(os.path.join(tokens_dir, "src"), exist_ok=True)

with open(os.path.join(tokens_dir, "package.json"), "w") as f:
    json.dump({
      "name": "@nexus/design-tokens",
      "version": "0.1.0",
      "private": True,
      "main": "./src/index.ts",
      "types": "./src/index.ts"
    }, f, indent=2)

with open(os.path.join(tokens_dir, "src", "index.ts"), "w") as f:
    f.write("""export const colors = {
  nexusPurple: '#534AB7',
  lifeTeal: '#1D9E75',
  energyCoral: '#D85A30',
  trustBlue: '#185FA5',
  insightAmber: '#BA7517',
  healthGreen: '#3B6D11',
  emotionPink: '#993556',
  neutralGray: '#5F5E5A',
  
  // Semantic
  bgPrimary: '#070a12',
  bgSecondary: 'rgba(15, 23, 42, 0.98)',
  textPrimary: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#1e293b'
};

export const typography = {
  fontFamily: 'Nexus Sans, Inter, sans-serif',
  scale: {
    display: { size: '32px', weight: 500 },
    h1: { size: '22px', weight: 500 },
    h2: { size: '18px', weight: 500 },
    h3: { size: '15px', weight: 500 },
    body: { size: '14px', weight: 400 },
    bodySecondary: { size: '14px', weight: 400 },
    caption: { size: '12px', weight: 400 },
    label: { size: '11px', weight: 500, textTransform: 'uppercase' }
  }
};

export const spacing = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  20: '20px',
  24: '24px',
  32: '32px',
  40: '40px',
  48: '48px',
  64: '64px'
};
""")

# 5. packages/shared-types
types_dir = os.path.join(packages_dir, "shared-types")
os.makedirs(os.path.join(types_dir, "src"), exist_ok=True)

with open(os.path.join(types_dir, "package.json"), "w") as f:
    json.dump({
      "name": "@nexus/shared-types",
      "version": "0.1.0",
      "private": True,
      "main": "./src/index.ts",
      "types": "./src/index.ts",
      "devDependencies": {
        "typescript": "^5.4.5"
      }
    }, f, indent=2)

with open(os.path.join(types_dir, "src", "index.ts"), "w") as f:
    f.write("""export interface User {
  id: string;
  email: string;
  name: string;
  ageGroup: 'child' | 'teen' | 'adult' | 'senior';
}

export interface Family {
  id: string;
  members: User[];
  createdAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  domain: 'health' | 'education' | 'finance' | 'fitness' | 'social';
  insightType: 'alert' | 'recommendation' | 'update';
  message: string;
  timestamp: string;
}
""")

# 6. packages/api-contracts
contracts_dir = os.path.join(packages_dir, "api-contracts")
os.makedirs(os.path.join(contracts_dir, "src"), exist_ok=True)

with open(os.path.join(contracts_dir, "package.json"), "w") as f:
    json.dump({
      "name": "@nexus/api-contracts",
      "version": "0.1.0",
      "private": True,
      "main": "./src/index.ts",
      "types": "./src/index.ts",
      "dependencies": {
        "@nexus/shared-types": "workspace:*",
        "zod": "^3.23.8"
      },
      "devDependencies": {
        "typescript": "^5.4.5"
      }
    }, f, indent=2)

with open(os.path.join(contracts_dir, "src", "index.ts"), "w") as f:
    f.write("""import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  ageGroup: z.enum(['child', 'teen', 'adult', 'senior'])
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
""")

print("Scaffolded packages and turbo.json successfully.")
