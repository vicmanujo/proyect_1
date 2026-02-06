<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const drawer = ref(false) // 🟢 Variable para abrir/cerrar menú en celular

// Menú de usuario
const items = [
  { title: 'Iniciar sesión', to: '/login', icon: 'mdi-login' },
  { title: 'Registrarte', to: '/register', icon: 'mdi-account-plus' },
]

// Menú de demos (Aquí agregué 'Registros')
const demos = [
  { title: 'Calculadora', to: '/calculadora', icon: 'mdi-calculator' },
  { title: 'Formulario', to: '/formulario', icon: 'mdi-form-select' },
  { title: 'Crud', to: '/registros', icon: 'mdi-database' }, // 🟢 ¡Agregado!
  { title: 'Carrusel', to: '/carrusel', icon: 'mdi-view-carousel' },
  { title: 'Página Error', to: '/error', icon: 'mdi-alert-circle' },
]

// Migas de pan (Breadcrumbs)
const breadcrumbs = computed(() => {
  const currentPath = route.path
  const crumbs = [{ title: 'Inicio', disabled: false, to: '/', icon: 'mdi-home', color: 'grey-darken-1' }]
  if (currentPath === '/') return crumbs

  const esDemo = demos.find(d => d.to === currentPath)

  if (esDemo) {
    crumbs.push({ title: 'Demos', disabled: true, color: 'grey' })
    crumbs.push({ title: esDemo.title, disabled: true, color: '#42b883' })
  } else {
    let nombre = 'Página Actual'
    if (currentPath === '/login') nombre = 'Iniciar Sesión'
    if (currentPath === '/register') nombre = 'Registro'
    if (currentPath === '/hola-mundo') nombre = 'Hola Mundo'
    if (currentPath === '/captcha') nombre = 'Captcha'
    
    crumbs.push({ title: nombre, disabled: true, color: '#42b883' })
  }
  return crumbs
})
</script>

<template>
  <v-app theme="light"> 

    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
    >
      <v-list>
        <v-list-subheader>NAVEGACIÓN</v-list-subheader>
        
        <v-list-item to="/" prepend-icon="mdi-home" title="Inicio"></v-list-item>
        <v-list-item to="/hola-mundo" prepend-icon="mdi-hand-wave" title="Hola Mundo"></v-list-item>
        <v-list-item to="/captcha" prepend-icon="mdi-robot" title="Captcha"></v-list-item>

        <v-divider class="my-2"></v-divider>
        <v-list-subheader>DEMOS</v-list-subheader>

        <v-list-item 
            v-for="(demo, i) in demos" 
            :key="i" 
            :to="demo.to" 
            :prepend-icon="demo.icon" 
            :title="demo.title"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>


    <v-app-bar elevation="1" color="#35495e" class="text-white">
      
      <v-app-bar-nav-icon 
        class="d-md-none" 
        variant="text" 
        @click.stop="drawer = !drawer"
      ></v-app-bar-nav-icon>

      <template v-slot:prepend>
        <v-icon color="#42b883" size="large" class="ml-2 d-none d-md-flex">mdi-vuejs</v-icon>
      </template>

      <v-app-bar-title class="font-weight-bold">
        <span class="text-green-accent-3">Mi</span>Proyecto
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <div class="d-none d-md-flex">
        <v-btn to="/" prepend-icon="mdi-home" variant="text" class="text-capitalize">Inicio</v-btn>
        <v-btn to="/hola-mundo" prepend-icon="mdi-hand-wave" variant="text" class="text-capitalize">Hola Mundo</v-btn>
        <v-btn to="/captcha" prepend-icon="mdi-robot" variant="text" class="text-capitalize">Captcha</v-btn>

        <v-menu open-on-hover>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" color="#42b883" variant="text" append-icon="mdi-chevron-down" class="text-capitalize font-weight-bold">
              Demos
            </v-btn>
          </template>

          <v-list elevation="3" density="compact">
            <v-list-item v-for="(demo, i) in demos" :key="i" :to="demo.to" active-color="green">
              <template v-slot:prepend>
                <v-icon :icon="demo.icon" color="grey-darken-2"></v-icon>
              </template>
              <v-list-item-title>{{ demo.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <v-spacer></v-spacer>
      
      <v-menu transition="scale-transition" location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar color="#42b883" size="35">
              <v-icon color="white">mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>

        <v-list density="compact" width="200">
          <v-list-subheader class="text-uppercase font-weight-bold text-caption">Cuenta</v-list-subheader>
          <v-list-item v-for="(item, i) in items" :key="i" :to="item.to" link active-color="primary">
            <template v-slot:prepend>
              <v-icon :icon="item.icon" size="small"></v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container v-if="route.path !== '/'" class="pb-0 pt-4">
        <v-sheet rounded="lg" elevation="1" class="px-4 py-1">
            <v-breadcrumbs :items="breadcrumbs" density="compact">
                <template v-slot:divider>
                    <v-icon icon="mdi-chevron-right" size="small" color="grey"></v-icon>
                </template>
                <template v-slot:title="{ item }">
                    <div :style="{ color: item.color }" class="font-weight-bold text-caption text-uppercase">
                         <v-icon v-if="item.icon" :icon="item.icon" size="small" class="mr-1"></v-icon>
                        {{ item.title }}
                    </div>
                </template>
            </v-breadcrumbs>
        </v-sheet>
      </v-container>

      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.v-btn { letter-spacing: 0.5px; }
</style>