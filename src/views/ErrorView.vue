<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const irAlInicio = () => {
  // Lo mandamos al inicio (si no tiene sesión, el guardia lo mandará al login solito)
  router.push('/')
}
</script>

<template>
  <v-container fluid class="fill-height bg-blue-grey-lighten-5 d-flex align-center justify-center">
    <v-card elevation="8" rounded="xl" max-width="500" class="text-center pa-10 border-top-blue">
      
      <v-icon size="120" color="blue-grey-lighten-2" class="mb-6 floating-animation">
        mdi-server-network-off
      </v-icon>
      
      <h1 class="text-h4 font-weight-black text-blue-grey-darken-3 mb-2">¡Ups!</h1>
      <h2 class="text-h6 font-weight-medium text-grey-darken-1 mb-6">
        No eres tú, somos nosotros.
      </h2>
      
      <p class="text-body-1 text-grey-darken-2 mb-8 lh-lg">
        Parece que la página que buscas no existe o nuestros servidores tuvieron un pequeño tropiezo. 
        Nuestros ingenieros ya están revisando los cables.
      </p>

      <v-btn 
        color="#1867C0" 
        size="x-large" 
        variant="elevated" 
        class="text-none font-weight-bold px-8 text-white"
        rounded="lg"
        prepend-icon="mdi-home"
        @click="irAlInicio"
      >
        Volver al inicio
      </v-btn>

    </v-card>
  </v-container>
</template>

<style scoped>
.fill-height {
  min-height: 100vh;
}
.border-top-blue {
  border-top: 8px solid #1867C0 !important;
}
.lh-lg {
  line-height: 1.6;
}
.floating-animation {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}
</style>