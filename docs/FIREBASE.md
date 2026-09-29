# Activar la nube (datos compartidos en tiempo real)

Con esto, lo que registre una persona lo ve la otra al instante. Es gratis para un grupo pequeño (plan Spark de Firebase; no pide tarjeta).

## 1. Crear el proyecto
1. Entra a https://console.firebase.google.com con tu cuenta de Google → **Agregar proyecto** → nombre, por ejemplo `caminantes-grupo`. Puedes desactivar Google Analytics.

## 2. Inicio de sesión
1. **Compilación → Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña → Habilitar → Guardar.**
2. Pestaña **Usuarios → Agregar usuario**: crea las dos cuentas (correo y contraseña de cada quien).
3. Pestaña **Configuración → Acciones del usuario**: desactiva **Habilitar crear (registrarse)**, para que nadie más pueda crear cuentas.

## 3. Base de datos
1. **Compilación → Firestore Database → Crear base de datos** → ubicación cercana (por ejemplo `us-east1`) → **Modo de producción**.
2. Pestaña **Reglas**: pega el contenido de `firestore.rules` de este proyecto, **cambia los dos correos por los reales** y pulsa **Publicar**.

## 4. Conectar la app
1. **Configuración del proyecto (engranaje) → Tus apps → Web (`</>`)** → registra la app (sin Hosting) → copia el objeto `firebaseConfig`.
2. Pégalo en `js/firebase-config.js`, reemplazando `null`:
   ```js
   const FIREBASE_CONFIG = { apiKey: '...', authDomain: '...', projectId: '...', storageBucket: '...', messagingSenderId: '...', appId: '...' };
   ```
3. Sube los cambios a GitHub. En un minuto la app pedirá **correo y contraseña** y guardará todo en la nube.

## 5. Pasar los datos que ya tenían
Los datos del modo local no se suben solos. Antes de activar la nube, en la versión local: **Respaldo → Descargar respaldo**. Después de activarla, quien entre primero: **Respaldo → Restaurar respaldo** (los datos quedan compartidos).

## Notas
- Las fotos se guardan comprimidas (≈ 650 KB máx.) dentro de Firestore; el plan gratis da 1 GB y 20 000 escrituras por día.
- Si dos personas editan **lo mismo** a la vez, gana el último cambio guardado.
- Sin internet la app sigue funcionando con la copia local y se sincroniza al volver la conexión.
- Los valores de `firebaseConfig` no son secretos; la seguridad la dan el inicio de sesión y las reglas.
- Con la nube activa, `js/accounts.js` y `CREDENCIALES.txt` ya no se usan.
