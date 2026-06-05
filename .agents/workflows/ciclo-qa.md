---
description: Flujo automatizado para revisar cambios, escribir pruebas, correr la suite y reportar resultados.
---

---
description: Ciclo autónomo de QA blindado contra bucles.
steps: 10
---

# Workflow: Ciclo Autónomo de QA y Sanity Check
Description: Flujo automatizado para revisar cambios, escribir pruebas, correr la suite y reportar resultados.

## Pasos del Agente:
1. **Analizar Cambios:** Ejecutar `git diff` o revisar los archivos modificados recientemente en el espacio de trabajo para entender qué cambió.
2. **Diseñar Escenarios:** Crear un plan de pruebas rápido identificando qué funciones o componentes se vieron afectados y qué casos borde podrían fallar.
3. **Escribir Pruebas:** Crear o modificar los archivos de test pertinentes en el proyecto utilizando las herramientas de edición de archivos (`write` / `edit`).
4. **Ejecutar Suite (Modo Seguro):** - Correr el comando de testing del proyecto (ej: `npm test`, `pytest`) usando la herramienta `bash`.
   - *Configuración de seguridad:* El comando bash general está configurado en `"ask"`, por lo que el agente detendrá el flujo para pedirte permiso antes de correr la consola.
5. **Analizar Diagnóstico:** - Si los tests pasan: Generar un resumen del porcentaje de cobertura alcanzado.
   - Si los tests fallan: Leer el log de errores de la consola y proponer la solución exacta al código principal o corregir el test si estaba desactualizado.