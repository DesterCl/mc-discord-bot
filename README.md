# Bot de Discord ↔ Servidor de Minecraft (con GitHub + Oracle Cloud)

Bot que verifica si tu servidor de Minecraft está online y:

- Se **une** a un canal de voz cuando el servidor está online.
- **Sale** del canal de voz cuando está offline.
- Cambia su **estado** ("Jugando X/Y jugadores" o "Servidor offline").
- Al arrancar, **imprime en consola el link de invitación** para añadirlo a tu servidor de Discord (no necesitas generarlo manualmente en el portal).

---

## Índice

1. [Subir el proyecto a GitHub](#1-subir-el-proyecto-a-github)
2. [Crear el bot en Discord](#2-crear-el-bot-en-discord)
3. [Crear la VPS gratuita en Oracle Cloud](#3-crear-la-vps-gratuita-en-oracle-cloud)
4. [Desplegar el bot en la VPS desde GitHub](#4-desplegar-el-bot-en-la-vps-desde-github)
5. [Dejarlo corriendo 24/7](#5-dejarlo-corriendo-247)
6. [Actualizar el bot en el futuro](#6-actualizar-el-bot-en-el-futuro)
7. [Hacer todo esto desde el celular](#7-hacer-todo-esto-desde-el-celular)

---

## 1. Subir el proyecto a GitHub

1. Crea una cuenta en https://github.com si no tienes.
2. Crea un repositorio nuevo (puede ser **privado**, ya que aquí no va tu token, solo el código):
   - Ve a https://github.com/new
   - Nombre sugerido: `mc-discord-bot`
   - Visibilidad: **Private** (recomendado)
   - No agregues README/gitignore ahí (ya los tienes en este proyecto).
3. Sube estos archivos al repo. Desde tu computadora:

```bash
cd mc-discord-bot
git init
git add .
git commit -m "Bot inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mc-discord-bot.git
git push -u origin main
```

> ⚠️ El archivo `.env` con tus datos reales **nunca se sube** (ya está en `.gitignore`). Solo se sube `.env.example` como plantilla.

---

## 2. Crear el bot en Discord

1. Ve a https://discord.com/developers/applications → **New Application**.
2. Pestaña **Bot** → **Reset Token** → copia el token (lo usarás como `DISCORD_TOKEN`).
3. Pestaña **General Information** → copia el **Application ID** (lo usarás como `CLIENT_ID`).
4. No necesitas generar el link de invitación manualmente — el bot lo imprime solo al arrancar (ver más abajo). Pero si quieres generarlo tú mismo: OAuth2 → URL Generator → Scopes: `bot` → Permissions: `Connect`, `Speak`.

**IDs que necesitas de Discord (activa "Modo Desarrollador" en Configuración → Avanzado):**
- `GUILD_ID`: clic derecho sobre tu servidor de Discord → Copiar ID.
- `VOICE_CHANNEL_ID`: clic derecho sobre el canal de voz → Copiar ID.

---

## 3. Crear la VPS gratuita en Oracle Cloud

1. Regístrate en https://www.oracle.com/cloud/free/ (pide tarjeta solo para verificar identidad, el plan Always Free no cobra).
2. En el menú ☰ → **Compute** → **Instances** → **Create Instance**.
3. Configura:
   - **Name**: `mc-discord-bot` (o el que quieras)
   - **Image**: Ubuntu 22.04 o 24.04
   - **Shape**: `VM.Standard.E2.1.Micro` (Always Free) o `VM.Standard.A1.Flex` (Ampere, también gratis con límites)
4. En **Add SSH keys**, selecciona "Generate a key pair for me" y **descarga la clave privada** (algo como `ssh-key-xxxx.key`). La necesitarás para conectarte.
5. Click **Create**. Espera 1-2 minutos a que la instancia quede "Running".
6. Copia la **Public IP Address** de la instancia (la verás en su página de detalles).

---

## 4. Desplegar el bot en la VPS desde GitHub

Conéctate por SSH (desde Mac/Linux/Windows con terminal):

```bash
chmod 600 ssh-key-xxxx.key
ssh -i ssh-key-xxxx.key ubuntu@TU_IP_PUBLICA
```

Una vez dentro de la VPS:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 y Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Instalar PM2 (mantiene el bot corriendo 24/7)
sudo npm install -g pm2

# Clonar tu repo (si es privado, te pedirá usuario y un Personal Access Token en vez de contraseña)
git clone https://github.com/TU_USUARIO/mc-discord-bot.git
cd mc-discord-bot

# Instalar dependencias
npm install

# Crear tu .env real con tus datos
cp .env.example .env
nano .env
```

Dentro del editor `nano`, completa tus valores reales (`DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `VOICE_CHANNEL_ID`, `MC_HOST`, `MC_PORT`). Guarda con `Ctrl+O`, Enter, y sal con `Ctrl+X`.

> Si tu repo es **privado**, GitHub ya no acepta contraseña normal para `git clone` por HTTPS. Necesitas crear un **Personal Access Token**: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (permiso `repo`). Úsalo como "contraseña" cuando Git te lo pida.

---

## 5. Dejarlo corriendo 24/7

```bash
pm2 start index.js --name mc-discord-bot
pm2 save
pm2 startup
```

El último comando (`pm2 startup`) imprime una línea que debes copiar y ejecutar tal cual — hace que el bot arranque solo si la VPS se reinicia.

**Ver los logs (incluido el link de invitación al arrancar):**
```bash
pm2 logs mc-discord-bot
```

Ahí verás algo como:
```
🔗 Link para invitar el bot a tu servidor de Discord:
https://discord.com/api/oauth2/authorize?client_id=...&permissions=3145728&scope=bot
```

Copia ese link, ábrelo en el navegador, selecciona tu servidor de Discord y autoriza. Solo necesitas hacer esto **una vez**.

---

## 6. Actualizar el bot en el futuro

Si editas el código en GitHub (desde tu PC o el móvil) y quieres actualizar la VPS:

```bash
cd mc-discord-bot
git pull
npm install        # solo si cambiaste dependencias
pm2 restart mc-discord-bot
```

---

## 7. Hacer todo esto desde el celular

Sí es posible hacer **todo el proceso sin computadora**, usando estas apps (disponibles para Android e iOS):

### Apps necesarias
- **GitHub mobile** (oficial) — para crear el repo y editar archivos directamente desde el navegador o la app.
- **Termius** (gratis) o **JuiceSSH** (Android) — cliente SSH para conectarte a la VPS de Oracle desde el móvil.
- Navegador del celular — para el panel de Oracle Cloud y el portal de desarrolladores de Discord.

### Pasos

1. **Crear cuenta en Oracle Cloud y la VPS**: se hace igual desde el navegador del celular (la consola de Oracle es responsive). Sigue el paso 3 de este documento tal cual, pero desde el navegador móvil.

2. **Descargar la clave SSH en el celular**: Oracle te la da como archivo `.key`. Descárgala y dale a "Compartir/Guardar en archivos" (Android: carpeta Descargas; iOS: app Archivos).

3. **Crear el repo en GitHub desde el móvil**:
   - Abre la app de GitHub o el navegador → github.com/new
   - Crea el repo, y usa la opción **"Upload files"** en el navegador para arrastrar/seleccionar los archivos del bot (puedes subir este mismo ZIP descomprimido, o crear cada archivo con "Add file → Create new file" y pegar el contenido).

4. **Conectarte a la VPS por SSH desde el celular**:
   - Abre **Termius** → New Host → pega la IP pública de tu VPS.
   - En "Key", importa el archivo `.key` que descargaste de Oracle.
   - Usuario: `ubuntu`.
   - Conecta — ahora tienes una terminal completa en tu celular.

5. **Ejecuta los mismos comandos del paso 4 y 5 de este README** directamente en la terminal de Termius: instalar Node, clonar el repo, configurar `.env` (puedes usar `nano` igual, se escribe con el teclado del celular sin problema), y levantar con PM2.

6. **Editar el `.env` en el celular sin nano** (más cómodo): en vez de `nano`, puedes crear el archivo directamente:
   ```bash
   cat > .env << 'EOF'
   DISCORD_TOKEN=tu_token
   CLIENT_ID=tu_client_id
   GUILD_ID=tu_guild_id
   VOICE_CHANNEL_ID=tu_channel_id
   MC_HOST=tu_ip_o_dominio_mc
   MC_PORT=25565
   MC_EDITION=java
   CHECK_INTERVAL_MS=30000
   EOF
   ```
   Pega tus valores reales y ejecuta. Termius permite pegar texto copiado desde otra app (por ejemplo, si guardaste tus tokens en notas).

7. **Ver el link de invitación**: una vez el bot esté corriendo, en la misma terminal de Termius ejecuta `pm2 logs mc-discord-bot`, copia el link que aparece, y ábrelo en el navegador del celular para invitar el bot.

Con esto tienes el ciclo completo — crear repo, configurar VPS, desplegar y actualizar — gestionable 100% desde el teléfono.

---

## Notas importantes

- El bot **no transmite audio real**, solo se conecta/desconecta del canal de voz como indicador visual de que el servidor está online.
- Verifica que el puerto de tu Minecraft (`MC_PORT`) esté accesible públicamente desde la VPS de Oracle (si tu servidor de Minecraft está detrás de un router casero, necesitas port forwarding; si está en un hosting como SparkedHost, ya es público).
- Si usas Bedrock, cambia `MC_EDITION=bedrock` y el puerto por defecto a `19132`.
