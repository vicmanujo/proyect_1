<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables de estado y formularios
const fase = ref(1) // Fase 1 = Datos, Fase 2 = Código
const visible = ref(false)
const cargando = ref(false)

const correo = ref('')
const password = ref('')
const confirmarPassword = ref('')
const codigo = ref('')

const mensajeError = ref('')
const mensajeExito = ref('')

// --- ENVIAR DATOS (PASO 1) ---
const registrarPaso1 = async () => {
  mensajeError.value = '';
  
  if (!correo.value || !password.value || !confirmarPassword.value) {
    mensajeError.value = "Llena todos los campos";
    return;
  }
  if (password.value !== confirmarPassword.value) {
    mensajeError.value = "Las contraseñas no coinciden";
    return;
  }

  cargando.value = true;
  try {
    const res = await fetch(`${baseURL}/api/registro-paso1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: correo.value, password: password.value })
    });
    const data = await res.json();

    if (data.success) {
      mensajeExito.value = data.message; // "Código enviado a tu correo"
      fase.value = 2; // 🟢 CAMBIAMOS A LA PANTALLA DE CÓDIGO
    } else {
      mensajeError.value = data.message;
    }
  } catch (error) {
    mensajeError.value = "Error de conexión";
  } finally {
    cargando.value = false;
  }
}

// --- VERIFICAR CÓDIGO (PASO 2) ---
const registrarPaso2 = async () => {
  mensajeError.value = '';
  
  if (!codigo.value || codigo.value.length !== 6) {
    mensajeError.value = "El código debe tener 6 dígitos";
    return;
  }

  cargando.value = true;
  try {
    const res = await fetch(`${baseURL}/api/registro-paso2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: correo.value, codigo: codigo.value })
    });
    const data = await res.json();

    if (data.success) {
      alert("¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.");
      router.push('/login'); // Lo mandamos al login para que entre con su nueva cuenta
    } else {
      mensajeError.value = data.message;
    }
  } catch (error) {
    mensajeError.value = "Error de conexión";
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height bg-grey-lighten-4" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        
        <v-img class="mx-auto my-6" max-width="80" src="https://cdn.vuetifyjs.com/docs/images/logos/vuetify-logo-v3-slim-text-light.svg"></v-img>

        <v-card class="mx-auto pa-8 pa-md-10" elevation="8" max-width="448" rounded="xl">
          
          <h2 class="text-h5 font-weight-bold mb-6 text-center text-grey-darken-3">
            {{ fase === 1 ? 'Crear una cuenta' : 'Verifica tu correo' }}
          </h2>

          <v-expand-transition>
            <v-alert v-if="mensajeError" type="error" variant="tonal" density="compact" class="mb-4 text-caption">
                {{ mensajeError }}
            </v-alert>
          </v-expand-transition>

          <v-expand-transition>
            <v-alert v-if="mensajeExito && fase === 2" type="success" variant="tonal" density="compact" class="mb-4 text-caption">
                {{ mensajeExito }}
            </v-alert>
          </v-expand-transition>

          <div v-if="fase === 1">
              <div class="text-subtitle-1 text-medium-emphasis mb-1">Correo Electrónico</div>
              <v-text-field
                v-model="correo"
                density="compact"
                placeholder="ejemplo@correo.com"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                color="#42b883"
                class="mb-2"
              ></v-text-field>

              <div class="text-subtitle-1 text-medium-emphasis mb-1">Contraseña</div>
              <v-text-field
                v-model="password"
                :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                :type="visible ? 'text' : 'password'"
                density="compact"
                placeholder="Ingresa tu contraseña"
                prepend-inner-icon="mdi-lock-outline"
                variant="outlined"
                color="#42b883"
                class="mb-2"
                @click:append-inner="visible = !visible"
              ></v-text-field>

              <div class="text-subtitle-1 text-medium-emphasis mb-1">Confirmar Contraseña</div>
              <v-text-field
                v-model="confirmarPassword"
                :type="visible ? 'text' : 'password'"
                density="compact"
                placeholder="Repite tu contraseña"
                prepend-inner-icon="mdi-lock-check-outline"
                variant="outlined"
                color="#42b883"
                class="mb-6"
              ></v-text-field>

              <v-btn class="mb-4 font-weight-bold text-white" color="#42b883" size="large" block rounded="lg" :loading="cargando" @click="registrarPaso1">
                Siguiente Paso <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
          </div>

          <div v-if="fase === 2">
              <p class="text-center text-body-2 text-grey-darken-1 mb-6">
                Hemos enviado un código de 6 dígitos a <strong>{{ correo }}</strong>. Revísalo e ingrésalo aquí abajo.
              </p>

              <v-text-field
                v-model="codigo"
                placeholder="000000"
                variant="outlined"
                color="#42b883"
                class="text-center text-h4 font-weight-bold"
                maxlength="6"
                counter="6"
                @input="v => { codigo = v.target.value.replace(/[^0-9]/g, '') }"
                @keyup.enter="registrarPaso2"
              ></v-text-field>

              <v-btn class="mb-4 mt-2 font-weight-bold text-white" color="#42b883" size="large" block rounded="lg" :loading="cargando" @click="registrarPaso2">
                Verificar y Registrar <v-icon end>mdi-check-decagram</v-icon>
              </v-btn>

              <div class="text-center">
                  <v-btn variant="plain" color="grey" size="small" @click="fase = 1">
                      <v-icon start>mdi-arrow-left</v-icon> Corregir correo
                  </v-btn>
              </div>
          </div>

          <v-divider class="my-4"></v-divider>
          <v-card-text class="text-center pb-0">
            ¿Ya tienes cuenta?
            <router-link to="/login" class="text-green-darken-1 text-decoration-none font-weight-bold">
              Inicia sesión <v-icon icon="mdi-login"></v-icon>
            </router-link>
          </v-card-text>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Asegura que el texto en el campo del PIN quede centrado y grande */
:deep(.v-field__input) {
    text-align: inherit;
}
</style>