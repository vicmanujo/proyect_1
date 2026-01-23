<script setup>
// Sin lógica
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">

    <v-card 
      elevation="10" 
      rounded="xl" 
      width="90%" 
      max-width="500"
      class="pa-8 text-center"
    >
      <div class="mb-6">
        <v-icon 
          size="100" 
          color="orange-darken-2" 
          class="bounce-animation"
        >
          mdi-traffic-cone
        </v-icon>
      </div>

      <h2 class="text-h4 font-weight-black text-grey-darken-3 mb-3">
        Es que no eres tú,<br>
        <span class="text-red-accent-3">somos nosotros.</span>
      </h2>

      <p class="text-subtitle-1 text-grey-darken-1 mb-8 px-4">
        Esta página está en construcción o algo salió mal.
        <br>
        <strong>Estamos trabajando en ello.</strong> 
      </p>

      <v-divider class="mb-8"></v-divider>

      <v-btn 
        to="/" 
        color="#42b883" 
        size="x-large" 
        rounded="pill" 
        elevation="6"
        class="text-white font-weight-bold px-10"
      >
        <v-icon start icon="mdi-home-variant" class="mr-2"></v-icon>
        Volver al Inicio
      </v-btn>

    </v-card>

  </v-container>
</template>

<style scoped>
/* Solo la animación del cono */
.bounce-animation {
  animation: bounce 2s infinite ease-in-out;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-25px);
  }
  60% {
    transform: translateY(-15px);
  }
}
</style>