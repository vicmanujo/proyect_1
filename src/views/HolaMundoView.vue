<script setup>
import { ref } from 'vue'
</script>

<template>
  <div class="background-container d-flex align-center justify-center">
    
    <div class="circle circle-1"></div>
    <div class="circle circle-2"></div>

    <v-card 
      elevation="10" 
      rounded="xl" 
      width="100%" 
      max-width="550"
      class="pa-8 text-center position-relative glass-card"
    >
      <div class="logos-wrapper mb-6">
        <v-row justify="center" align="center" no-gutters>
          
          <v-col cols="auto">
            <v-img 
              src="https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg" 
              width="70"
              class="logo-animation"
            ></v-img>
            <div class="text-caption font-weight-bold mt-1 text-grey-darken-1">Vue.js</div>
          </v-col>

          <v-col cols="auto" class="px-4">
            <v-icon size="x-large" color="grey-lighten-2">mdi-plus</v-icon>
          </v-col>

          <v-col cols="auto">
            <v-img 
              src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-light.png" 
              width="60"
              class="logo-animation"
            ></v-img>
            <div class="text-caption font-weight-bold mt-1 text-grey-darken-1">Vuetify</div>
          </v-col>

        </v-row>
      </div>

      <h1 class="text-h4 font-weight-black text-blue-grey-darken-4 mb-2">
        ¡Hola Mundo!
      </h1>

      <p class="text-subtitle-1 mb-6 text-grey-darken-1">
        Proyecto  creado con.
        <br>
        
      </p>

      <v-divider class="mb-6"></v-divider>

      <div class="d-flex justify-center gap-4">
        <v-btn 
          color="#42b883" 
          size="x-large" 
          rounded="pill" 
          elevation="3"
          class="text-white font-weight-bold mr-3"
          to="/"
        >
          Empezar
        </v-btn>

        <v-btn 
          variant="outlined" 
          color="#35495e" 
          size="x-large" 
          rounded="pill"
          href="https://vuetifyjs.com" 
          target="_blank"
        >
          Documentación
        </v-btn>
      </div>

    </v-card>
  </div>
</template>

<style scoped>
/* 1. EL FONDO GRADIENT */
.background-container {
  width: 100%;
  height: 100vh; /* Ocupa toda la altura */
  /* Degradado de Azul Oscuro (Izquierda) a Verde Vue (Derecha/Abajo) */
  background: linear-gradient(135deg, #35495e 0%, #42b883 100%);
  position: relative;
  overflow: hidden; /* Para que los círculos no se salgan de la pantalla */
}

/* 2. CÍRCULOS DECORATIVOS (Efecto moderno) */
.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1); /* Blanco transparente */
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -50px;
  left: -50px;
}

.circle-2 {
  width: 500px;
  height: 500px;
  bottom: -150px;
  right: -100px;
  background: rgba(255, 255, 255, 0.05);
}

/* 3. ANIMACIÓN DE LOS LOGOS */
.logo-animation {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.logo-animation:hover {
  transform: translateY(-10px) scale(1.1);
  filter: drop-shadow(0 10px 10px rgba(0,0,0,0.2));
}

/* Ajuste para móviles: que no ocupe 100vh si la barra de navegación estorba */
@media (max-width: 600px) {
  .background-container {
    padding: 20px;
    height: auto;
    min-height: 90vh;
  }
}
</style>