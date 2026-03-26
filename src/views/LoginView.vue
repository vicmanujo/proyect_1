<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(false)
const loading = ref(false)

const cuenta = ref('')
const password = ref('')
const errorMsg = ref('')
const captchaToken = ref(null)

const recaptchaContainer = ref(null)

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
// 🟢 Leemos tu llave pública del .env
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

// ==========================================
// CARGA NATIVA DEL RECAPTCHA DE GOOGLE
// ==========================================
onMounted(() => {
  window.onRecaptchaCargado = () => {
    window.grecaptcha.render(recaptchaContainer.value, {
      sitekey: siteKey,
      callback: (token) => {
        captchaToken.value = token
        errorMsg.value = ''
      },
      'expired-callback': () => {
        captchaToken.value = null
      }
    })
  }

  const script = document.createElement('script')
  script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaCargado&render=explicit'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
})

// ==========================================
// LÓGICA DE INICIO DE SESIÓN
// ==========================================
const iniciarSesion = async () => {
  errorMsg.value = ''

  if (!cuenta.value || !password.value) {
    errorMsg.value = 'Por favor ingresa tu cuenta y contraseña.'
    return
  }
  if (!captchaToken.value) {
    errorMsg.value = 'Por favor, marca la casilla de "No soy un robot".'
    return
  }

  loading.value = true

  try {
    const res = await fetch(`${baseURL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuenta: cuenta.value,
        password: password.value,
        captchaToken: captchaToken.value
      })
    })

    const data = await res.json()

    if (data.success) {
      // 🟢 GUARDAMOS EL TOKEN (Pase VIP)
      localStorage.setItem('sesion_activa', data.token) 
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      
      // Forzamos recarga para que el Cadenero nos deje entrar
      window.location.href = '/' 
    } else {
      errorMsg.value = data.message 
      // Si falla la contraseña, reseteamos el Captcha por seguridad
      if (window.grecaptcha) window.grecaptcha.reset()
      captchaToken.value = null
    }
  } catch (error) {
    console.error("Error:", error)
    errorMsg.value = 'Error de conexión con el servidor.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="d-flex flex-column justify-center align-center fill-height bg-grey-lighten-4" style="min-height: 100vh;">
    
    <div class="text-center mb-6">
      <v-icon size="60" color="#1867C0" class="mb-2">mdi-domain</v-icon>
      <h2 class="font-weight-bold text-grey-darken-3">CORP SYSTEM</h2>
    </div>

    <v-card class="pa-8 w-100" elevation="4" max-width="448" rounded="xl">
      <div class="text-h6 font-weight-bold text-grey-darken-3 mb-6 text-center">Inicia sesión en tu cuenta</div>

      <v-alert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4 text-caption">
        {{ errorMsg }}
      </v-alert>

      <v-form @submit.prevent="iniciarSesion">
        <div class="text-subtitle-2 text-medium-emphasis mb-1">Cuenta de Usuario o Correo</div>
        <v-text-field
          v-model="cuenta"
          density="compact"
          placeholder="ejemplo@empresa.com"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          color="#1867C0"
          class="mb-2"
        ></v-text-field>

        <div class="text-subtitle-2 text-medium-emphasis mb-1 d-flex align-center justify-space-between">
          Contraseña
          <a class="text-caption text-decoration-none font-weight-bold" style="color: #1867C0;" href="#" rel="noopener noreferrer">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <v-text-field
          v-model="password"
          :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
          :type="visible ? 'text' : 'password'"
          density="compact"
          placeholder="Ingresa tu contraseña"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          color="#1867C0"
          class="mb-4"
          @click:append-inner="visible = !visible"
        ></v-text-field>

        <v-card class="mb-4" color="blue-lighten-5" variant="flat" border>
          <v-card-text class="text-grey-darken-2 text-caption">
            <v-icon start size="small" color="#1867C0">mdi-information</v-icon>
            Advertencia: Después de 3 intentos fallidos, tu cuenta será temporalmente bloqueada.
          </v-card-text>
        </v-card>

        <div class="d-flex justify-center mb-6">
          <div ref="recaptchaContainer"></div>
        </div>

        <v-btn type="submit" class="mb-4 font-weight-bold" color="#1867C0" size="large" block :loading="loading">
          Ingresar
        </v-btn>
      </v-form>
    </v-card>
  </div>
</template>