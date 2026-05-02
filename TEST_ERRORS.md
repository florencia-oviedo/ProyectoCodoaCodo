# Documentación de Errores en Tests - loggerService.test.ts

## Resumen
Durante la configuración y ejecución inicial de los tests unitarios para `loggerService.js` usando Jest y TypeScript, se encontraron varios errores que impidieron que los tests pasaran. Esta documentación detalla cada error, su causa y la solución aplicada.

## Errores Encontrados

### 1. Error de Importación en TypeScript
**Descripción**: El test fallaba al importar funciones desde `loggerService.js` con el error:
```
error TS2307: Cannot find module './loggerService' or its corresponding type declarations.
```

**Causa**: Jest no podía resolver módulos JavaScript desde archivos TypeScript sin configuración adicional.

**Solución**:
- Cambié el import de `'./loggerService'` a `'../loggerService'` para ajustar la ruta relativa.
- Agregué `moduleNameMapper` en `package.json` para mapear el módulo JS:
  ```json
  "moduleNameMapper": {
    "^./loggerService$": "<rootDir>/js/loggerService.js"
  }
  ```

### 2. Configuración Inválida de Jest
**Descripción**: Warning de Jest:
```
Unknown option "moduleNameMapping" with value {...} was found.
```

**Causa**: Error tipográfico en la opción de Jest; la opción correcta es `moduleNameMapper`.

**Solución**:
- Corregí `"moduleNameMapping"` a `"moduleNameMapper"` en `package.json`.

### 3. Lógica Incorrecta en Test de Niveles de Log
**Descripción**: El test "should not log messages below the set log level" fallaba porque esperaba 0 logs para `info()` cuando `setLogLevel('INFO')`, pero el nivel `INFO` debería permitir mensajes de `INFO` y superiores.

**Causa**: Malentendido en la lógica de niveles de log. Los niveles son jerárquicos: DEBUG < INFO < WARN < ERROR.

**Solución**:
- Ajusté el test para verificar correctamente niveles inferiores:
  ```typescript
  setLogLevel('WARN');
  info('Info message');
  expect(getLogs()).toHaveLength(0); // INFO < WARN, no debería loggear
  ```

### 4. Console No Espiado en Test
**Descripción**: El test "should log messages to the console" fallaba con:
```
Matcher error: received value must be a mock or spy function
```

**Causa**: `console.debug` no era un spy, por lo que no se podía verificar si fue llamado.

**Solución**:
- Mockeé `console.debug` usando Jest:
  ```typescript
  const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  // ... test ...
  consoleSpy.mockRestore();
  ```

### 5. Variable Interna No Accesible
**Descripción**: El test "should handle invalid log levels" fallaba con `ReferenceError: currentLogLevel is not defined`.

**Causa**: `currentLogLevel` era una variable `let` interna en `loggerService.js`, no exportada, por lo que no se podía acceder desde el test.

**Solución**:
- Eliminé el test directo sobre `currentLogLevel`.
- Reemplacé con un test de comportamiento: verificar que un nivel inválido no cambie el comportamiento de logging.

### 6. Parámetro de Data en Console Log
**Descripción**: El test esperaba `null` como segundo argumento en `console.debug`, pero recibía `""`.

**Causa**: En `loggerService.js`, se usaba `data || ''` para evitar `undefined` en console.

**Solución**:
- Cambié `data || ''` a `data` directamente en el console.log para mantener consistencia con el test.

## Resultado Final
Después de aplicar todas las correcciones:
- **Test Suites**: 1 passed, 1 total
- **Tests**: 8 passed, 8 total
- Todos los tests pasan exitosamente, cubriendo funcionalidades como logging por niveles, filtrado, output a consola, etc.

## Lecciones Aprendidas
- Configurar correctamente Jest para proyectos mixtos JS/TS.
- Entender la jerarquía de niveles de log.
- Usar spies de Jest para verificar side effects como console output.
- Exportar variables necesarias o probar comportamiento indirectamente.
- Mantener consistencia entre código y tests.

## Archivos Modificados
- `js/__tests__/loggerService.test.ts`: Correcciones en lógica y mocks.
- `js/loggerService.js`: Agregado exports para tests y ajuste en console log.
- `package.json`: Configuración de Jest corregida.
- `tsconfig.json`: Agregado para soporte TypeScript.