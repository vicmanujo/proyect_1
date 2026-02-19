<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

const visible = ref(false)
const correo = ref('')
const password = ref('')
const cargando = ref(false)
const mensajeError = ref('')

const iniciarSesion = async () => {
  mensajeError.value = '';

  // Validación básica
  if (!correo.value || !password.value) {
    mensajeError.value = "Por favor ingresa correo y contraseña";
    return;
  }

  cargando.value = true;

  try {
    const res = await fetch(`${baseURL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: correo.value, password: password.value })
    });

    const data = await res.json();

    if (data.success) {
      // 🟢 GUARDAMOS SESIÓN (Temporalmente en el navegador)
      localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
      
      // Lo mandamos a la pantalla de registros o inicio
      router.push('/registros'); 
    } else {
      mensajeError.value = data.message;
    }
  } catch (error) {
    mensajeError.value = "Error de conexión con el servidor";
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height bg-grey-lighten-4" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        
        <v-img
          class="mx-auto my-6"
          max-width="80"
          src="https://cdn.vuetifyjs.com/docs/images/logos/vuetify-logo-v3-slim-text-light.svg"
        ></v-img>

        <v-card
          class="mx-auto pa-8 pa-md-12"
          elevation="8"
          max-width="448"
          rounded="xl"
        >
          <div class="text-subtitle-1 text-medium-emphasis mb-1">Correo Electrónico</div>

          <v-text-field
            v-model="correo"
            density="compact"
            placeholder="ejemplo@correo.com"
            prepend-inner-icon="mdi-email-outline"
            variant="outlined"
            color="#42b883"
            @keyup.enter="iniciarSesion"
          ></v-text-field>

          <div class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between mb-1">
            Contraseña
            <router-link to="/recuperar" class="text-caption text-decoration-none text-green-darken-1"> ¿Olvidaste tu contraseña?
            </router-link>
          </div>

          <v-text-field
            v-model="password"
            :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
            :type="visible ? 'text' : 'password'"
            density="compact"
            placeholder="Ingresa tu contraseña"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            color="#42b883"
            @click:append-inner="visible = !visible"
            @keyup.enter="iniciarSesion"
          ></v-text-field>

          <v-expand-transition>
            <v-alert
                v-if="mensajeError"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-6 text-caption"
            >
                {{ mensajeError }}
            </v-alert>
          </v-expand-transition>

          <v-card class="mb-8" color="surface-variant" variant="tonal">
            <v-card-text class="text-medium-emphasis text-caption">
              Advertencia: Después de 3 intentos fallidos, la cuenta se bloqueará temporalmente.
            </v-card-text>
          </v-card>

          <v-btn
            class="mb-8 font-weight-bold"
            color="#42b883"
            size="large"
            block
            rounded="lg"
            :loading="cargando"
            @click="iniciarSesion"
          >
            Iniciar Sesión
          </v-btn>

          <v-card-text class="text-center">
            ¿No tienes cuenta?
            <router-link to="/register" class="text-green-darken-1 text-decoration-none font-weight-bold">
              Regístrate ahora <v-icon icon="mdi-chevron-right"></v-icon>
            </router-link>
          </v-card-text>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>