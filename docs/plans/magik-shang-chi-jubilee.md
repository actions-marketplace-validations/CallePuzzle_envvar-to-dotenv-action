# Plan: Aplicar cambios del PR #37, correcciones de seguridad y tests

## Contexto
Aplicar los cambios funcionales del PR #37 (upgrade a Node 24, actualización de dependencias y workflows) al repositorio `CallePuzzle/envvar-to-dotenv-action`, corrigiendo además problemas de seguridad en el código fuente (Path Traversal y ReDoS) y verificando/ampliando tests. **NO** se aplicarán los cambios de branding del fork (`CallePuzzle` → `aloknecessary` en README).

---

## 1. Workflows de GitHub Actions

### `.github/workflows/release.yaml`
- `actions/checkout@v4` → `actions/checkout@v6`
- Agregar step **Setup Node**: `actions/setup-node@v6.4.0` con `node-version: "24.x"`
- Agregar step **Setup Bun**: `oven-sh/setup-bun@v2.2.0` con `bun-version: latest`
- Agregar step **Install & Build**: `bun install --frozen-lockfile` + `bun run build`
- `cycjimmy/semantic-release-action@v3` → `cycjimmy/semantic-release-action@v6`

### `.github/workflows/test.yml`
- `actions/checkout@v4` → `actions/checkout@v6`
- `actions/setup-node@v4` → `actions/setup-node@v6.4.0`
- `node-version: "20.x"` → `"24.x"`
- `actions/cache@v4` → `actions/cache@v5`
- `oven-sh/setup-bun@v2` → `oven-sh/setup-bun@v2.2.0`

> **Nota SonarCloud**: El usuario ha decidido mantener las versiones semánticas (`@v6`, `@v6.4.0`, etc.) en lugar de SHA completos. Resolverá los 3 hotspots de SonarCloud (`githubactions:S7637`) por su cuenta.

---

## 2. Configuración de Release

### `.releaserc.yaml`
- Agregar plugin `@semantic-release/git` con:
  - `assets: ['dist/**']`
  - `message: 'chore(release): ${nextRelease.version} [skip ci]'`

---

## 3. Metadata del Action

### `action.yml`
- `runs.using: 'node20'` → `'node24'`

---

## 4. Dependencias y build (`package.json`)

### `dependencies`
- `@actions/core`: `^1.11.1` → `^3.0.1`
- `dotenv`: `^16.5.0` → `^17.4.2`
- Agregar `engines: { "node": ">=24.0.0" }`

### `devDependencies`
- Agregar `@semantic-release/git: ^10.0.1`
- `@types/jest`: `^29.5.14` → `^30.0.0`
- `@types/node`: `^22.15.20` → `^25.9.2`
- `@vercel/ncc`: `^0.38.3` → `^0.38.4`
- `jest`: `^29.7.0` → `^30.4.2`
- `ts-jest`: `^29.3.4` → `^29.4.11`
- `typescript`: `^5.8.3` → `^6.0.3`

### Post-cambio
- Ejecutar `bun install --frozen-lockfile` (o `bun install` si hay cambios de lock)
- Ejecutar `bun run build` para regenerar `dist/index.js`

---

## 5. Correcciones de seguridad en código fuente

### 5.1 Path Traversal en `src/write.ts`
**Problema**: `fs.writeFileSync(variable.envPath, envVars)` escribe en cualquier path sin validación.
**Solución**: Validar que `envPath` resuelto esté dentro del workspace (`process.env.GITHUB_WORKSPACE || process.cwd()`). Si escapa, lanzar error.

### 5.2 Regex Injection / ReDoS en `src/writeVariableNamesByFilter.ts`
**Problema**: `new RegExp(input.variableNamesByFilter)` compila regex de input sin validar.
**Solución**:
1. Envolver en `try/catch` para rechazar patrones inválidos.
2. Agregar validación básica contra patrones ReDoS comunes (cuantificadores anidados peligrosos).
3. Considerar agregar dependencia `safe-regex` si la validación manual no es suficiente.

---

## 6. Tests

### 6.1 Verificar tests existentes
- Ejecutar `bun run test` y asegurar que pasen tras todas las actualizaciones.
- Si `jest` 30 + `ts-jest` 29 presentan incompatibilidades, ajustar configuración.

### 6.2 Nuevos tests a añadir en `__tests__/main.test.ts`
- **Path Traversal**: Intentar escribir en `../../../etc/passwd` (o similar) y verificar que lanza error.
- **Regex inválida**: Pasar un patrón mal formado (ej. `[`) y verificar que no crashea.
- **Regex ReDoS**: Pasar un patrón peligroso (ej. `(a+)+`) y verificar que es rechazado.
- **Variable no definida**: Verificar que no se escribe nada cuando la variable de entorno no existe.
- **Valores con caracteres especiales**: Verificar que valores con `=`, `"`, `'`, espacios, saltos de línea se manejan correctamente.

---

## 7. Archivos a NO modificar
- `README.md`: Mantener referencias a `CallePuzzle` y versiones originales del repo.

---

## Orden de ejecución
1. Modificar workflows (`release.yaml`, `test.yml`)
2. Modificar `package.json`, `.releaserc.yaml`, `action.yml`
3. Instalar dependencias (`bun install`)
4. Corregir seguridad en `src/write.ts` y `src/writeVariableNamesByFilter.ts`
5. Añadir/actualizar tests
6. Ejecutar tests (`bun run test`)
7. Build (`bun run build`)
8. Verificar que `dist/index.js` se generó correctamente
