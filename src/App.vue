<script setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'

// Menú de usuario
const items = [
  { title: 'Iniciar sesión', to: '/login', icon: 'mdi-login' },
  { title: 'Registrarte', to: '/register', icon: 'mdi-account-plus' }
]

// Menú de demos (Agrupamos tus botones extra aquí para limpiar la barra)
const demos = [
  { title: 'Calculadora', to: '/calculadora', icon: 'mdi-calculator' },
  { title: 'Formulario', to: '/formulario', icon: 'mdi-form-select' },
  { title: 'Carrusel', to: '/error', icon: 'mdi-view-carousel' },
  { title: 'Página Error', to: '/error', icon: 'mdi-alert-circle' },
]
</script>

<template>
  <v-app theme="light"> <v-app-bar 
      elevation="1" 
      color="#35495e" 
      class="text-white"
    >
      <template v-slot:prepend>
        <v-icon color="#42b883" size="large" class="ml-2">mdi-vuejs</v-icon>
      </template>

      <v-app-bar-title class="font-weight-bold">
        <span class="text-green-accent-3">Mi</span>Proyecto
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <div class="d-none d-md-flex">
        <v-btn to="/" prepend-icon="mdi-home" variant="text" class="text-capitalize">
          Inicio
        </v-btn>
        
        <v-btn to="/hola-mundo" prepend-icon="mdi-hand-wave" variant="text" class="text-capitalize">
          Hola Mundo
        </v-btn>

        <v-btn to="/captcha" prepend-icon="mdi-robot" variant="text" class="text-capitalize">
          Captcha
        </v-btn>

        <v-menu open-on-hover>
          <template v-slot:activator="{ props }">
            <v-btn 
              v-bind="props" 
              color="#42b883" 
              variant="text" 
              append-icon="mdi-chevron-down"
              class="text-capitalize font-weight-bold"
            >
              Demos
            </v-btn>
          </template>

          <v-list elevation="3" density="compact">
            <v-list-item
              v-for="(demo, i) in demos"
              :key="i"
              :to="demo.to"
              active-color="green"
            >
              <template v-slot:prepend>
                <v-icon :icon="demo.icon" color="grey-darken-2"></v-icon>
              </template>
              <v-list-item-title>{{ demo.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <v-spacer></v-spacer>

      <v-btn icon="mdi-magnify" class="mr-1"></v-btn>
      
      <v-menu transition="scale-transition" location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar color="#42b883" size="35">
              <v-icon color="white">mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>

        <v-list density="compact" width="200">
          <v-list-subheader class="text-uppercase font-weight-bold text-caption">
            Cuenta
          </v-list-subheader>
          
          <v-list-item
            v-for="(item, i) in items"
            :key="i"
            :to="item.to"
            link
            active-color="primary"
          >
            <template v-slot:prepend>
              <v-icon :icon="item.icon" size="small"></v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* Un pequeño ajuste para que los links se vean elegantes */
.v-btn {
  letter-spacing: 0.5px;
}
</style>