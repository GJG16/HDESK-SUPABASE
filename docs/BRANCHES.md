# Mapa de ramas

El siguiente diagrama muestra la estructura actual de ramas y merges del repositorio.

```mermaid
gitGraph
  commit id: "init"
  branch main
  commit id: "v2.0.0"
  commit id: "main:ui-redesign"
  branch develop
  checkout develop
  commit id: "merge-sprint2"
  branch feature/sprint2-full-implementation
  checkout feature/sprint2-full-implementation
  commit id: "feat: sprint2"
  checkout develop
  merge feature/sprint2-full-implementation tag: "merged→develop"
  branch feature/v2-roles-jira-ui
  checkout feature/v2-roles-jira-ui
  commit id: "feat:v2-roles"
  checkout develop
  merge feature/v2-roles-jira-ui tag: "merged→develop"
  branch feature/tests-cleanup
  checkout feature/tests-cleanup
  commit id: "tests:cleanup"
  checkout develop
  merge feature/tests-cleanup tag: "merged→develop"
  branch feature/e2e-ui-fixes
  checkout feature/e2e-ui-fixes
  commit id: "e2e:ui-fixes"
  checkout develop
  merge feature/e2e-ui-fixes tag: "merged→develop"
  checkout develop
  branch feature/wip-from-local
  checkout feature/wip-from-local
  commit id: "wip: cambios locales"
  push origin feature/wip-from-local
```
