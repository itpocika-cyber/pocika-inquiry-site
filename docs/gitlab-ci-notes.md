# GitLab CI/CD Pipeline Documentation

This document explains the automated pipeline configured in [`.gitlab-ci.yml`](file:///d:/IT-Solanki%20Devrajsinh/Pocika%20Development/pocika-inquiry-system/.gitlab-ci.yml) for the `pocika-inquiry-system` repository.

The pipeline ensures code quality, unit & security tests, and build artifacts are verified on every push before code ever reaches deployment environments on Render or Vercel.

---

## 1. Pipeline Stages

The pipeline runs across 4 distinct stages in sequential order:

| Stage | Jobs | Description |
| :--- | :--- | :--- |
| **`install`** | `install:server`, `install:client` | Uses `npm ci` in each workspace directory (`server/` and `client/`). Dependencies are cached with keys tied to `package-lock.json` to keep runs fast. |
| **`lint`** | `lint:server`, `lint:client` | Validates syntax integrity and runs ESLint if an ESLint configuration file is detected. |
| **`test`** | `test:server` | Runs the automated backend test suite (`node --test`) covering JWT authentication, RBAC, unauthenticated health check, and Cloudinary media flows. Runs with dummy test credentials and `FIREBASE_ENABLED=false`. |
| **`build`** | `build:client`, `build:server` | Compiles Vite production bundle (`client/dist/`) and verifies all Node.js entry point scripts on `main` and `production` branches. |

---

## 2. GitLab CI/CD Variables Checklist

The pipeline uses safe, self-contained mock/test environment variables during the `test:server` job. If you wish to override these or connect to dedicated staging services in GitLab CI/CD (**Settings** → **CI/CD** → **Variables**), configure the following:

### Server Test & Runtime Variables
- `MONGODB_URI` *(Optional in CI; uses local URI for mocked schema tests. Masked if set to external Atlas test cluster)*
- `JWT_SECRET` *(Optional in CI; pipeline defaults to test secret. Set Masked for staging)*
- `CLIENT_ORIGIN` *(Optional in CI; defaults to localhost)*
- `CLOUDINARY_CLOUD_NAME` *(Optional in CI; mock used during testing)*
- `CLOUDINARY_API_KEY` *(Optional in CI; mock used during testing)*
- `CLOUDINARY_API_SECRET` *(Optional in CI; mock used during testing)*
- `FIREBASE_ENABLED` *(Set to `false`)*

### Client Build Variables
- `VITE_API_BASE_URL` *(Optional in CI; placeholder used during build test)*

> [!NOTE]
> **Best Practice for Secrets:** Never commit real secrets to git. In GitLab, mark sensitive variables as **Protected** and **Masked**.
