# 🚀 Guía de Configuración Inicial — Bot WhatsApp
> Seguí estos 3 pasos antes de arrancar el código. Estimado total: **40 minutos**.

---

## PASO 1: API Key de Gemini (Google AI Studio)
> ⏱️ 5 minutos — 100% gratis

### 1.1. Crear la API Key
1. Abrí el navegador y andá a **[aistudio.google.com](https://aistudio.google.com)**
2. Iniciá sesión con tu cuenta de Google (la misma que uses habitualmente).
3. En el panel izquierdo, hacé clic en **"Get API Key"**.
4. Hacé clic en el botón azul **"Create API Key"**.
5. En el dropdown, seleccioná **"Create API key in new project"**.
6. Copiá la clave que aparece (empieza con `AIzaSy...`).

### 1.2. Guardarla en tu proyecto
Abrí el archivo `.env` del proyecto y agregá esta línea:
```bash
GEMINI_API_KEY=AIzaSy...TU_CLAVE_AQUI
```

✅ **Listo con Gemini.** Guardá la clave en un lugar seguro, no la subas a GitHub.

---

## PASO 2: Número de Teléfono para el Bot
> ⏱️ 5-10 minutos — Necesitás un número que NO esté vinculado a WhatsApp normal

Tenés 2 opciones:

### Opción A: SIM vieja o número de repuesto ⭐ (Recomendada)
Si tenés un número argentino que no uses activamente en WhatsApp:
1. Insertá esa SIM en cualquier teléfono.
2. Desvinculá WhatsApp si lo tiene (Configuración → Cuenta → Eliminar mi cuenta).
3. Tené el teléfono a mano para recibir el SMS de verificación de Meta (Paso 3).

> **El número no necesita tener línea activa después de la verificación.** Solo lo necesitás para recibir ese primer SMS.

### Opción B: Número Virtual de Twilio (~$1 USD/mes)
Si no tenés un número de repuesto:
1. Andá a **[twilio.com](https://twilio.com)** y creá una cuenta (gratis para empezar).
2. En el panel, comprá un número argentino: `+54 11 XXXX-XXXX` (≈ $1 USD/mes).
3. Ese número lo vas a usar en el Paso 3.

---

## PASO 3: Cuenta y App en Meta for Developers
> ⏱️ 25-30 minutos — Gratis

### 3.1. Crear la cuenta de desarrollador
1. Andá a **[developers.facebook.com](https://developers.facebook.com)**
2. Iniciá sesión con tu cuenta de Facebook personal (es necesaria para verificar identidad).
3. Si te pide confirmar tu cuenta de desarrollador, completá la verificación.

### 3.2. Crear la aplicación
1. Hacé clic en **"Mis apps"** → **"Crear app"**.
2. En el tipo de app, elegí **"Business"** y hacé clic en "Siguiente".
3. Completá el formulario:
   - **Nombre de la app**: `GastosFamiliaBot` (o el que quieras)
   - **Email de contacto**: Tu email
   - **Cuenta de Business**: Podés dejarlo vacío por ahora
4. Hacé clic en **"Crear app"**.

### 3.3. Agregar el producto WhatsApp
1. En el panel de tu app, hacé scroll hasta encontrar el producto **"WhatsApp"**.
2. Hacé clic en **"Configurar"**.
3. Si te pide una cuenta de Meta Business, hacé clic en **"Crear nueva"** y completá el formulario básico.

### 3.4. Configurar el número de teléfono
1. En el menú izquierdo, andá a **WhatsApp → Configuración de la API**.
2. En la sección **"Desde"**, hacé clic en **"Agregar número de teléfono"**.
3. Ingresá el número del Paso 2 (con código de país: `+54 11...`).
4. Meta te enviará un SMS con un código de verificación — ingresalo.

### 3.5. Conseguir los tokens necesarios
Una vez verificado el número, vas a ver esta pantalla:

```
Sección: Enviar y recibir mensajes
├── Token de acceso temporal: EAABc...xyz  ← COPIARLO
└── ID de número de teléfono: 1234567890   ← COPIARLO
```

1. **Copiá el Token de Acceso** (dura 24hs — después lo reemplazamos por uno permanente).
2. **Copiá el ID del Número de Teléfono**.
3. Agregá ambos al `.env` del proyecto:
```bash
WHATSAPP_TOKEN=EAABc...xyz
PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=gastos_familia_webhook_2026
```
> El `VERIFY_TOKEN` lo inventás vos — es una contraseña secreta que Meta usará para verificar tu servidor.

### 3.6. Registrar el Webhook (hacerlo DESPUÉS del Sprint 1)
> ⚠️ Este paso lo hacés DESPUÉS de que el código esté corriendo. Lo incluyo para que lo tengas a mano.

1. En el menú izquierdo: **WhatsApp → Configuración → Webhooks**.
2. Hacé clic en **"Editar"**.
3. Completá:
   - **URL de callback**: `https://gastos.tudominio.com/api/whatsapp/webhook`
   - **Token de verificación**: El mismo que pusiste en `.env` (`gastos_familia_webhook_2026`)
4. Hacé clic en **"Verificar y guardar"**.
5. En la sección de Suscripciones, activá el campo **`messages`**.

---

## ✅ Checklist Final

Antes de decirme que empiece con el Sprint 1, confirmá que tenés:

- [ ] `GEMINI_API_KEY` copiada en el `.env`
- [ ] `WHATSAPP_TOKEN` copiado en el `.env`
- [ ] `PHONE_NUMBER_ID` copiado en el `.env`
- [ ] `WHATSAPP_VERIFY_TOKEN` definido en el `.env`
- [ ] App de Meta en estado "Modo de desarrollo" (por ahora está bien así)

---

## 📌 Tu .env completo debería verse así

```bash
# === EXISTENTES ===
SECRET_KEY=tu_clave_jwt
DATABASE_URL=sqlite:///./data/gastos.db
ALLOWED_ORIGINS=http://192.168.1.185:8080

# === NUEVOS (WhatsApp Bot) ===
GEMINI_API_KEY=AIzaSy...
WHATSAPP_TOKEN=EAABc...
PHONE_NUMBER_ID=12345678901234
WHATSAPP_VERIFY_TOKEN=gastos_familia_webhook_2026
```

---

> Cuando tengas estos 4 datos en el `.env`, decime **"listo, arrancamos el Sprint 1"** y empezamos a codear. 🚀
