<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const irALogin = () => {
  router.push('/login')
}
</script>

<template>
  <v-container fluid class="fill-height bg-grey-lighten-4 d-flex align-center justify-center">
    <v-card elevation="12" rounded="xl" max-width="550" class="text-center pa-8 border-top-red position-relative overflow-hidden">
      
      <div class="bg-red-lighten-5 position-absolute w-100 h-100" style="top: 0; left: 0; opacity: 0.5; pointer-events: none;"></div>

      <div class="position-relative z-1">
        <v-icon size="100" color="red-darken-2" class="mb-4 text-glow">mdi-shield-lock-outline</v-icon>
        
        <h1 class="text-h4 font-weight-black text-grey-darken-4 mb-2">Acceso Denegado</h1>
        <v-chip color="red-darken-2" variant="flat" size="large" class="font-weight-bold mb-6 px-6 text-subtitle-1">
          <v-icon start>mdi-alert-octagon</v-icon>
          Error 403 - Violación de Seguridad
        </v-chip>
        
        <p class="text-body-1 text-grey-darken-3 mb-6 lh-lg">
          Hemos detectado un intento de acceso a una ruta para la cual <b>no tienes autorización</b>. 
          Aplicando nuestras estrictas políticas de seguridad corporativa <i>(Zero Trust)</i>, tu sesión ha sido destruida y tu cuenta 
          ha sido <b class="text-red-darken-2">suspendida automáticamente por 15 minutos</b>.
        </p>

        <v-divider class="mb-6"></v-divider>

        <v-btn 
          color="red-darken-2" 
          size="x-large" 
          variant="elevated" 
          class="text-none font-weight-bold px-8"
          rounded="lg"
          prepend-icon="mdi-login"
          @click="irALogin"
        >
          Entendido, volver al Login
        </v-btn>
      </div>

    </v-card>
  </v-container>
</template>

<style scoped>
.fill-height {
  min-height: 100vh;
}
.border-top-red {
  border-top: 8px solid #D32F2F !important;
}
.z-1 {
  z-index: 1;
}
.lh-lg {
  line-height: 1.6;
}
.text-glow {
  filter: drop-shadow(0px 0px 15px rgba(211, 47, 47, 0.4));
}
</style>