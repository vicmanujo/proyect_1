<script setup>
import { ref, computed, onMounted, provide, watch } from 'vue' // 🟢 Agregamos watch
import { RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const drawer = ref(true) 

const esLogin = computed(() => route.path === '/login')
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''

const rutasOcultas = [
  { to: '/menu', tituloPadre: 'Configuración', titulo: 'Menús Principales' },
  { to: '/modulo', tituloPadre: 'Configuración', titulo: 'Módulos' },
  { to: '/perfil', tituloPadre: 'Configuración', titulo: 'Perfiles' },
  { to: '/permisos', tituloPadre: 'Configuración', titulo: 'Permisos' },
  { to: '/usuario', tituloPadre: 'Configuración', titulo: 'Usuarios' },
  { to: '/mi-perfil', tituloPadre: 'Cuenta', titulo: 'Configuración de Cuenta' }
]

const usuarioLogueado = ref(null)

// ==========================================
// 🟢 1. EL TRUCO DEL ACORDEÓN
// ==========================================
const carpetasAbiertas = ref([]) 
watch(carpetasAbiertas, (nuevoValor) => {
  // Si el usuario abre más de 1 carpeta, forzamos a la lista a quedarse SOLO con la última que tocó
  if (nuevoValor.length > 1) {
    carpetasAbiertas.value = [nuevoValor[nuevoValor.length - 1]]
  }
})

// ==========================================
// 🟢 2. ORDENAMIENTO (A-Z y Z-A)
// ==========================================
const menuDinamico = ref([])
const ordenAscendente = ref(true) // Controla la dirección

const alternarOrden = () => {
  ordenAscendente.value = !ordenAscendente.value
}

// Creamos un menú ordenado "al vuelo" sin tocar el original de la BD
const menuDinamicoOrdenado = computed(() => {
  // Clonamos el menú para poder modificarlo
  const menuCopia = JSON.parse(JSON.stringify(menuDinamico.value))

  return menuCopia.sort((a, b) => {
    // Ordenamos las carpetas principales
    if (a.titulo < b.titulo) return ordenAscendente.value ? -1 : 1
    if (a.titulo > b.titulo) return ordenAscendente.value ? 1 : -1
    return 0
  }).map(padre => {
    // Ordenamos las subcarpetas de adentro
    padre.submodulos.sort((a, b) => {
      if (a.strNombreModulo < b.strNombreModulo) return ordenAscendente.value ? -1 : 1
      if (a.strNombreModulo > b.strNombreModulo) return ordenAscendente.value ? 1 : -1
      return 0
    })
    return padre
  })
})

const cargarMenuDinamico = async () => {
  if (!usuarioLogueado.value) return 
  
  try {
    const res = await fetch(`${baseURL}/api/menu-dinamico?idPerfil=${usuarioLogueado.value.idPerfil}`)
    const data = await res.json()
    if (data.success) {
      menuDinamico.value = data.menu

      localStorage.setItem('menuDinamico', JSON.stringify(data.menu))
    }
  } catch (error) {
    console.error("Error cargando el menú lateral:", error)
  }
}

onMounted(() => {
  const usr = localStorage.getItem('usuario')
  if (usr) {
    usuarioLogueado.value = JSON.parse(usr)
  }
  cargarMenuDinamico()
  window.addEventListener('perfil-actualizado', (event) => {
    // Cuando el Perfil lanza el evento, actualizamos las variables de la barra superior al instante
    usuarioLogueado.value = event.detail
    })
})

provide('actualizarMenuLateral', cargarMenuDinamico)

const breadcrumbs = computed(() => {
  const currentPath = route.path
  if (currentPath === '/login') return [] 

  const crumbs = [{ title: 'Inicio', to: '/', color: 'grey' }]
  
  const rutaOculta = rutasOcultas.find(r => r.to === currentPath)
  if (rutaOculta) {
    crumbs.push({ title: rutaOculta.tituloPadre, disabled: true, color: 'grey' })
    crumbs.push({ title: rutaOculta.titulo, disabled: true, color: '#1976D2' }) 
    return crumbs 
  }

  for (const padre of menuDinamico.value) {
    const hijo = padre.submodulos.find(s => s.strRutaUrl === currentPath)
    if (hijo) {
      crumbs.push({ title: padre.titulo, disabled: true, color: 'grey' })
      crumbs.push({ title: hijo.strNombreModulo, disabled: true, color: '#1976D2' }) 
      return crumbs
    }
  }

  return crumbs
})

const cerrarSesion = () => {
  localStorage.clear()
  sessionStorage.clear()
  window.location.href = '/login'
}
</script>

<template>
  <v-app theme="light"> 
    
    <v-navigation-drawer 
      v-if="!esLogin" 
      v-model="drawer" 
      :permanent="$vuetify.display.mdAndUp" 
      elevation="2"
    >
      <div class="pa-4 text-center bg-blue-darken-3">
        <v-icon size="40" color="white" class="mb-2">mdi-domain</v-icon>
        <h3 class="text-white font-weight-bold">CORP SYSTEM</h3>
      </div>

      <v-list density="compact" nav v-model:opened="carpetasAbiertas">
        <v-list-item to="/" prepend-icon="mdi-view-dashboard" title="Inicio"></v-list-item>

        <v-divider class="my-2"></v-divider>
        
        <div class="d-flex align-center justify-space-between px-2 mt-2 mb-1">
          <span class="text-caption text-grey-darken-1 font-weight-bold text-uppercase">Módulos del Sistema</span>
          <v-btn icon size="x-small" variant="text" color="grey-darken-1" @click="alternarOrden" :title="ordenAscendente ? 'Ordenar Z-A' : 'Ordenar A-Z'">
            <v-icon>{{ ordenAscendente ? 'mdi-sort-alphabetical-ascending' : 'mdi-sort-alphabetical-descending' }}</v-icon>
          </v-btn>
        </div>

        <v-list-group v-for="padre in menuDinamicoOrdenado" :key="padre.id" :value="padre.titulo">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" :prepend-icon="padre.icono" :title="padre.titulo"></v-list-item>
          </template>

          <v-list-item
            v-for="hijo in padre.submodulos"
            :key="hijo.id"
            :to="hijo.strRutaUrl"
            :title="hijo.strNombreModulo"
            prepend-icon="mdi-circle-small"
            active-color="blue-darken-3"
          ></v-list-item>
        </v-list-group>

      </v-list>
    </v-navigation-drawer>

    <v-app-bar elevation="1" color="white" v-if="!esLogin">
      <v-app-bar-nav-icon class="d-md-none" variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

      <v-breadcrumbs :items="breadcrumbs" density="compact">
        <template v-slot:divider><v-icon icon="mdi-chevron-right" size="small" color="grey"></v-icon></template>
        <template v-slot:title="{ item }">
          <span :style="{ color: item.color }" class="font-weight-bold text-caption text-uppercase">{{ item.title }}</span>
        </template>
      </v-breadcrumbs>

      <v-spacer></v-spacer>

      <v-menu min-width="250" rounded="xl" offset-y>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" class="mr-4">
            <v-avatar color="#1867C0" size="40" class="elevation-2">
              <v-img v-if="usuarioLogueado?.fotoUrl" :src="usuarioLogueado.fotoUrl"></v-img>
              <span v-else class="text-white font-weight-bold text-h6">
                {{ usuarioLogueado?.nombre?.charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card rounded="xl" elevation="4">
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-avatar color="#1867C0" size="48">
                  <v-img v-if="usuarioLogueado?.fotoUrl" :src="usuarioLogueado.fotoUrl"></v-img>
                  <span v-else class="text-white font-weight-bold text-h5">{{ usuarioLogueado?.nombre?.charAt(0).toUpperCase() }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-grey-darken-3">{{ usuarioLogueado?.nombre }}</v-list-item-title>
              <v-list-item-subtitle class="text-success font-weight-medium">
                <v-icon size="small" color="success">mdi-circle</v-icon> En línea
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider></v-divider>

          <v-list density="compact" class="pa-2">
            <v-list-item to="/mi-perfil" rounded="lg" prepend-icon="mdi-account-cog-outline" title="Configuración de Cuenta" class="mb-1"></v-list-item>
            <v-list-item rounded="lg" prepend-icon="mdi-logout" title="Cerrar Sesión" base-color="red-darken-1" @click="cerrarSesion"></v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      
      <RouterView v-if="esLogin" />

      <v-container fluid class="fill-height align-start" v-else>
        <RouterView />
      </v-container>

    </v-main>

  </v-app>
</template>

<style scoped>
.v-list-group__items .v-list-item {
  padding-left: 2rem !important;
}
</style>