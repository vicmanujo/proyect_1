<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

const fase = ref(1) // 1 = Pedir Correo, 2 = Pedir Código y Nueva Contraseña
const visible = ref(false)
const cargando = ref(false)

const correo = ref('')
const codigo = ref('')
const nuevaPassword = ref('')
const confirmarPassword = ref('')

const mensajeError = ref('')
const mensajeExito = ref('')

// FASE 1: Solicitar Código
const solicitarCodigo = async () => {
  mensajeError.value = '';
  if (!correo.value) {
    mensajeError.value = "Ingresa tu correo";
    return;
  }

  cargando.value = true;
  try {
    const res = await fetch(`${baseURL}/api/olvide-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: correo.value })
    });
    const data = await res.json();

    if (data.success) {
      mensajeExito.value = data.message;
      fase.value = 2; // Pasamos a la fase 2
    } else {
      mensajeError.value = data.message;
    }
  } catch (error) {
    mensajeError.value = "Error de conexión";
  } finally {
    cargando.value = false;
  }
}

// FASE 2: Cambiar Contraseña
const cambiarContrasena = async () => {
  mensajeError.value = '';
  
  if (!codigo.value || codigo.value.length !== 6) {
    mensajeError.value = "Ingresa el código de 6 dígitos";
    return;
  }
  if (!nuevaPassword.value || nuevaPassword.value !== confirmarPassword.value) {
    mensajeError.value = "Las contraseñas no coinciden o están vacías";
    return;
  }

  cargando.value = true;
  try {
    const res = await fetch(`${baseURL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          correo: correo.value, 
          codigo: codigo.value, 
          nuevaPassword: nuevaPassword.value 
      })
    });
    const data = await res.json();

    if (data.success) {
      alert("¡Contraseña actualizada! Ya puedes iniciar sesión.");
      router.push('/login');
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
            Recuperar Contraseña
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
              <p class="text-caption text-grey-darken-1 mb-4 text-center">
                Ingresa el correo asociado a tu cuenta y te enviaremos un código para restablecer tu contraseña.
              </p>

              <div class="text-subtitle-1 text-medium-emphasis mb-1">Correo Electrónico</div>
              <v-text-field
                v-model="correo"
                density="compact"
                placeholder="ejemplo@correo.com"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                color="#42b883"
                class="mb-6"
                @keyup.enter="solicitarCodigo"
              ></v-text-field>

              <v-btn class="mb-4 font-weight-bold text-white" color="#42b883" size="large" block rounded="lg" :loading="cargando" @click="solicitarCodigo">
                Enviar Código <v-icon end>mdi-send</v-icon>
              </v-btn>
          </div>

          <div v-if="fase === 2">
              <p class="text-caption text-grey-darken-1 mb-4 text-center">
                Ingresa el código que enviamos a <b>{{ correo }}</b> y crea tu nueva contraseña.
              </p>

              <v-text-field
                v-model="codigo"
                placeholder="000000"
                variant="outlined"
                color="#42b883"
                class="text-center text-h5 font-weight-bold mb-2"
                maxlength="6"
                counter="6"
                density="compact"
                @input="v => { codigo = v.target.value.replace(/[^0-9]/g, '') }"
              ></v-text-field>

              <div class="text-subtitle-1 text-medium-emphasis mb-1">Nueva Contraseña</div>
              <v-text-field
                v-model="nuevaPassword"
                :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                :type="visible ? 'text' : 'password'"
                density="compact"
                placeholder="Ingresa tu nueva contraseña"
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
                @keyup.enter="cambiarContrasena"
              ></v-text-field>

              <v-btn class="mb-4 font-weight-bold text-white" color="#42b883" size="large" block rounded="lg" :loading="cargando" @click="cambiarContrasena">
                Actualizar Contraseña <v-icon end>mdi-check</v-icon>
              </v-btn>

              <div class="text-center">
                  <v-btn variant="plain" color="grey" size="small" @click="fase = 1">
                      <v-icon start>mdi-arrow-left</v-icon> Intentar con otro correo
                  </v-btn>
              </div>
          </div>

          <v-divider class="my-4"></v-divider>
          <v-card-text class="text-center pb-0">
            <router-link to="/login" class="text-grey-darken-1 text-decoration-none font-weight-bold">
              <v-icon start>mdi-arrow-left</v-icon> Volver a Iniciar Sesión
            </router-link>
          </v-card-text>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
:deep(.v-field__input) {
    text-align: inherit;
}
</style>