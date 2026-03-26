<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const route = useRoute()

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC) DIRECTO AL BACKEND
// ==========================================
// Por defecto en true para que cargue la interfaz visualmente
const permisosModuloActual = ref({ agregar: true, editar: true, eliminar: true, detalle: true })

const verificarPermisos = async () => {
  try {
    const usrStr = localStorage.getItem('usuario')
    if (!usrStr) return
    const usr = JSON.parse(usrStr)

    const res = await fetch(`${baseURL}/api/menu-dinamico?idPerfil=${usr.idPerfil}`)
    const data = await res.json()

    if (data.success) {
      const rutaActual = route.path 
      let moduloEncontrado = null

      for (const menu of data.menu) {
        const submodulo = menu.submodulos.find(sub => sub.strRutaUrl === rutaActual)
        if (submodulo) {
          moduloEncontrado = submodulo
          break
        }
      }

      // 🟢 En esta pantalla, lo más importante es el bitEditar para dejarte guardar los permisos
      if (moduloEncontrado) {
        permisosModuloActual.value = {
          agregar: moduloEncontrado.permisos.agregar,
          editar: moduloEncontrado.permisos.editar,
          eliminar: moduloEncontrado.permisos.eliminar,
          detalle: moduloEncontrado.permisos.detalle
        }
      }
    }
  } catch (error) {
    console.error("Error al verificar permisos:", error)
  }
}

// --- ESTADOS Y VARIABLES ---
const loading = ref(false)
const cargandoGuardar = ref(false)

const perfiles = ref([])
const modulos = ref([])
const perfilSeleccionado = ref(null)

const matrizPermisos = ref([])

// 🟢 SISTEMA DE NOTIFICACIONES (Snackbar)
const snackbar = ref({
  show: false,
  mensaje: '',
  color: 'success', 
  icono: 'mdi-check-circle'
})

const mostrarMensaje = (mensaje, tipo = 'success') => {
  snackbar.value.mensaje = mensaje
  snackbar.value.color = tipo === 'success' ? '#4CAF50' : '#E53935' 
  snackbar.value.icono = tipo === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
  snackbar.value.show = true
}

// 🟢 VARIABLES DE BÚSQUEDA Y ORDENAMIENTO
const busqueda = ref('')
const ordenarPor = ref('nombreModulo') 
const ordenAscendente = ref(true)

// ==========================================
// 🟢 FILTRADO Y ORDENAMIENTO INTELIGENTE
// ==========================================

const permisosFiltrados = computed(() => {
  if (!busqueda.value) return matrizPermisos.value
  const textoMinusculas = busqueda.value.toLowerCase()
  return matrizPermisos.value.filter(item => 
    item.nombreModulo.toLowerCase().includes(textoMinusculas)
  )
})

const permisosOrdenados = computed(() => {
  return [...permisosFiltrados.value].sort((a, b) => {
    let valorA = a[ordenarPor.value].toLowerCase()
    let valorB = b[ordenarPor.value].toLowerCase()

    if (valorA < valorB) return ordenAscendente.value ? -1 : 1
    if (valorA > valorB) return ordenAscendente.value ? 1 : -1
    return 0
  })
})

const cambiarOrden = (columna) => {
  if (ordenarPor.value === columna) {
    ordenAscendente.value = !ordenAscendente.value 
  } else {
    ordenarPor.value = columna
    ordenAscendente.value = true 
  }
}


// --- PAGINACIÓN (5 registros) ---
const paginaActual = ref(1)
const elementosPorPagina = 5

const totalPaginas = computed(() => Math.ceil(permisosOrdenados.value.length / elementosPorPagina) || 1)
const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return permisosOrdenados.value.slice(inicio, fin)
})

// 🟢 FUNCIÓN EXTRA: Seleccionar / Deseleccionar todos los de la página actual
const marcarTodos = ref(false)
watch(marcarTodos, (marcar) => {
  // Solo aplicamos si tiene permisos de edición
  if(permisosModuloActual.value.editar){
    registrosPaginados.value.forEach(item => {
      item.bitConsulta = marcar
      item.bitAgregar = marcar
      item.bitEditar = marcar
      item.bitEliminar = marcar
      item.bitDetalle = marcar
    })
  }
})

// --- FUNCIONES INICIALES ---

const cargarCatalogos = async () => {
  loading.value = true
  try {
    const [resPerfiles, resModulos] = await Promise.all([
      fetch(`${baseURL}/api/perfil`),
      fetch(`${baseURL}/api/modulo`)
    ])
    perfiles.value = await resPerfiles.json()
    modulos.value = await resModulos.json()
  } catch (error) {
    console.error("Error al cargar catálogos:", error)
    mostrarMensaje('Error de conexión al cargar catálogos', 'error')
  } finally {
    loading.value = false
  }
}

watch(perfilSeleccionado, async (nuevoIdPerfil) => {
  if (!nuevoIdPerfil) {
    matrizPermisos.value = []
    busqueda.value = ''
    marcarTodos.value = false
    return
  }

  loading.value = true
  paginaActual.value = 1 
  busqueda.value = ''
  marcarTodos.value = false

  try {
    const res = await fetch(`${baseURL}/api/permisos/${nuevoIdPerfil}`)
    const permisosGuardados = await res.json()

    matrizPermisos.value = modulos.value.map(modulo => {
      const guardado = permisosGuardados.find(p => p.idModulo === modulo.id)
      
      return {
        idModulo: modulo.id,
        nombreModulo: modulo.strNombreModulo,
        bitAgregar: guardado ? guardado.bitAgregar : false,
        bitEditar: guardado ? guardado.bitEditar : false,
        bitConsulta: guardado ? guardado.bitConsulta : false,
        bitEliminar: guardado ? guardado.bitEliminar : false,
        bitDetalle: guardado ? guardado.bitDetalle : false
      }
    })

  } catch (error) {
    console.error("Error al cargar la matriz:", error)
    mostrarMensaje('Error al cargar la matriz de permisos', 'error')
  } finally {
    loading.value = false
  }
})

const guardarPermisos = async () => {
  if (!perfilSeleccionado.value) return

  cargandoGuardar.value = true
  try {
    const res = await fetch(`${baseURL}/api/permisos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idPerfil: perfilSeleccionado.value,
        matrizPermisos: matrizPermisos.value 
      })
    })

    const data = await res.json()
    if (data.success) {
      mostrarMensaje("¡Permisos guardados y actualizados correctamente!", 'success')
      marcarTodos.value = false // Reseteamos el switch global
    } else {
      mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje("Error de conexión con el servidor", 'error')
  } finally {
    cargandoGuardar.value = false
  }
}

onMounted(async () => {
  await verificarPermisos() // 🟢 Validamos permisos antes de cargar
  cargarCatalogos()
})
</script>

<template>
  <v-container fluid class="pa-6">
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" :timeout="4000" elevation="10" rounded="pill">
      <div class="d-flex align-center text-white">
        <v-icon start class="mr-2">{{ snackbar.icono }}</v-icon>
        <span class="font-weight-bold">{{ snackbar.mensaje }}</span>
      </div>
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" color="white" @click="snackbar.show = false"></v-btn>
      </template>
    </v-snackbar>

    <v-row align="center" justify="space-between" class="mb-4">
      <v-col cols="12" md="4">
        <h2 class="text-h5 font-weight-bold" style="color: #1867C0;">
          <v-icon color="#1867C0" class="mr-2">mdi-shield-key</v-icon>
          Matriz de Permisos
        </h2>
        <p class="text-grey-darken-1 text-caption mt-1">
          Asigna los privilegios de acceso para cada perfil.
        </p>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar módulo..."
          variant="outlined"
          density="compact"
          color="#1867C0"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          :disabled="!perfilSeleccionado"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="4">
        <v-select
          v-model="perfilSeleccionado"
          :items="perfiles"
          item-title="strNombrePerfil"
          item-value="id"
          label="Selecciona un Perfil"
          variant="outlined"
          color="#1867C0"
          density="compact"
          prepend-inner-icon="mdi-account-group"
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <v-card v-if="!perfilSeleccionado" elevation="0" border class="pa-10 text-center bg-grey-lighten-4 rounded-xl">
      <v-icon size="60" color="grey-lighten-1" class="mb-4">mdi-gesture-tap</v-icon>
      <h3 class="text-grey-darken-1">Selecciona un perfil en la parte superior</h3>
      <p class="text-caption text-grey">La matriz de módulos y permisos aparecerá aquí.</p>
    </v-card>

    <v-card v-else elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>

      <div class="d-flex justify-end pr-6 pt-2 pb-1 bg-grey-lighten-4">
        <v-switch
          v-model="marcarTodos"
          label="Marcar/Desmarcar Todo (En esta página)"
          color="#1867C0"
          hide-details
          density="compact"
          class="text-caption font-weight-medium"
          :disabled="!permisosModuloActual.editar"
        ></v-switch>
      </div>
      <v-divider></v-divider>

      <v-table hover style="min-width: 900px;">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer" style="color: #1867C0; width: 250px;" @click="cambiarOrden('nombreModulo')">
              Módulo del Sistema
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'nombreModulo' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Consultar</th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Agregar</th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Editar</th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Eliminar</th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="color: #1867C0;">Ver Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.idModulo">
            <td class="text-grey-darken-3 font-weight-bold pl-6">
              <v-icon size="small" color="blue-lighten-2" class="mr-2">mdi-folder-key</v-icon>
              {{ item.nombreModulo }}
            </td>

            <td class="text-center">
              <v-checkbox v-model="item.bitConsulta" color="#1867C0" hide-details density="compact" class="d-inline-flex" :disabled="!permisosModuloActual.editar"></v-checkbox>
            </td>
            <td class="text-center">
              <v-checkbox v-model="item.bitAgregar" color="success" hide-details density="compact" class="d-inline-flex" :disabled="!permisosModuloActual.editar"></v-checkbox>
            </td>
            <td class="text-center">
              <v-checkbox v-model="item.bitEditar" color="warning" hide-details density="compact" class="d-inline-flex" :disabled="!permisosModuloActual.editar"></v-checkbox>
            </td>
            <td class="text-center">
              <v-checkbox v-model="item.bitEliminar" color="error" hide-details density="compact" class="d-inline-flex" :disabled="!permisosModuloActual.editar"></v-checkbox>
            </td>
            <td class="text-center">
              <v-checkbox v-model="item.bitDetalle" color="info" hide-details density="compact" class="d-inline-flex" :disabled="!permisosModuloActual.editar"></v-checkbox>
            </td>
          </tr>

          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="6" class="text-center pa-8 text-grey">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">
                {{ busqueda ? 'mdi-file-search-outline' : 'mdi-shield-off' }}
              </v-icon><br>
              {{ busqueda ? `No se encontraron módulos con "${busqueda}"` : 'Aún no hay módulos registrados en el sistema.' }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider></v-divider>

      <div class="d-flex align-center justify-space-between pa-4 bg-white">
        
        <div v-if="totalPaginas > 1 || matrizPermisos.length > 0" class="d-flex align-center">
          <v-btn icon="mdi-chevron-double-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual = 1"></v-btn>
          <v-btn icon="mdi-chevron-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual--"></v-btn>
          <span class="mx-4 text-subtitle-2 text-grey-darken-2 font-weight-bold">Página {{ paginaActual }} de {{ totalPaginas }}</span>
          <v-btn icon="mdi-chevron-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual++"></v-btn>
          <v-btn icon="mdi-chevron-double-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual = totalPaginas"></v-btn>
        </div>
        <div v-else></div>

        <v-btn v-if="permisosModuloActual.editar" color="#1867C0" prepend-icon="mdi-content-save-all" class="text-white font-weight-bold text-capitalize" rounded="lg" elevation="2" @click="guardarPermisos" :loading="cargandoGuardar">
          Guardar Permisos
        </v-btn>
      </div>

    </v-card>

  </v-container>
</template>

<style scoped>
.overflow-x-auto {
  overflow-x: auto !important;
}

.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s;
}
.cursor-pointer:hover {
  background-color: #f5f5f5 !important;
}

:deep(.v-checkbox .v-selection-control) {
  justify-content: center;
}
</style>