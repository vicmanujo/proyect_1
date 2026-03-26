<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute } from 'vue-router'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const actualizarMenuLateral = inject('actualizarMenuLateral')
const route = useRoute()

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC)
// ==========================================
const permisosModuloActual = ref({
  agregar: true, // Por defecto en true para que cargue visualmente rápido
  editar: true,
  eliminar: true,
  detalle: true
})

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

// --- DATOS REALES ---
const registros = ref([])
const loading = ref(false)

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
const ordenarPor = ref('strNombreMenu') 
const ordenAscendente = ref(true) 

// --- VARIABLES DE MODALES ---
const dialogoFormulario = ref(false)
const dialogoDetalle = ref(false)
const dialogoEliminar = ref(false)

const esEdicion = ref(false)
const cargandoGuardar = ref(false)
const formRef = ref(null)
const valido = ref(false)

const itemFormulario = ref({
  id: null,
  strNombreMenu: '',
  strRutaUrl: ''
})

// ==========================================
// 🟢 FILTRADO Y ORDENAMIENTO INTELIGENTE
// ==========================================

const registrosFiltrados = computed(() => {
  if (!busqueda.value) return registros.value
  const texto = busqueda.value.toLowerCase()
  return registros.value.filter(item => 
    item.strNombreMenu.toLowerCase().includes(texto) ||
    item.strRutaUrl.toLowerCase().includes(texto)
  )
})

const registrosOrdenados = computed(() => {
  return [...registrosFiltrados.value].sort((a, b) => {
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

// --- PAGINACIÓN ---
const paginaActual = ref(1)
const elementosPorPagina = 5

const totalPaginas = computed(() => Math.ceil(registrosOrdenados.value.length / elementosPorPagina) || 1)
const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  const fin = inicio + elementosPorPagina
  return registrosOrdenados.value.slice(inicio, fin)
})


// ==========================================
// LÓGICA DE URL AUTOMÁTICA
// ==========================================

const generarSlug = (texto) => {
  if (!texto) return '';
  const slug = texto.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
              .replace(/\s+/g, ''); 
  return '/' + slug;
}

watch(() => itemFormulario.value.strNombreMenu, (nuevoNombre) => {
  if (nuevoNombre) {
    const nombreLimpio = nuevoNombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, '');
    if (itemFormulario.value.strNombreMenu !== nombreLimpio) {
        itemFormulario.value.strNombreMenu = nombreLimpio;
    }
    itemFormulario.value.strRutaUrl = generarSlug(nombreLimpio);
  } else {
    itemFormulario.value.strRutaUrl = '';
  }
})

// --- VALIDACIONES ---
const reglasNombre = [
  v => !!v || 'El nombre del menú es obligatorio',
  v => (v && v.trim().length > 0) || 'No puede ser solo espacios',
  v => (v && v.length <= 50) || 'Máximo 50 caracteres',
]

// --- FUNCIONES CRUD ---

const cargarMenus = async () => {
  loading.value = true
  try {
    const res = await fetch(`${baseURL}/api/menu`)
    registros.value = await res.json()
  } catch (error) {
    console.error("Error al cargar menús:", error)
    mostrarMensaje("Error al conectar con la base de datos", "error")
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await verificarPermisos() // Validamos permisos antes de cargar
  cargarMenus()
})

const abrirCrear = () => {
  itemFormulario.value = { id: null, strNombreMenu: '', strRutaUrl: '' }
  esEdicion.value = false
  dialogoFormulario.value = true
}

const abrirEditar = (item) => {
  itemFormulario.value = { ...item }
  esEdicion.value = true
  dialogoFormulario.value = true
}

const abrirDetalle = (item) => {
  itemFormulario.value = { ...item }
  dialogoDetalle.value = true
}

const abrirEliminar = (item) => {
  itemFormulario.value = { ...item }
  dialogoEliminar.value = true
}

const guardarDatos = async () => {
  if (itemFormulario.value.strNombreMenu) itemFormulario.value.strNombreMenu = itemFormulario.value.strNombreMenu.trim()

  const { valid } = await formRef.value.validate()
  if (!valid) return

  const nombreIngresado = itemFormulario.value.strNombreMenu.toLowerCase()
  const esDuplicado = registros.value.some(menu => 
    menu.strNombreMenu.toLowerCase() === nombreIngresado && 
    menu.id !== itemFormulario.value.id 
  )

  if (esDuplicado) {
    mostrarMensaje(`El menú "${itemFormulario.value.strNombreMenu}" ya existe en el sistema.`, 'error')
    return 
  }

  cargandoGuardar.value = true

  try {
    const url = esEdicion.value ? `${baseURL}/api/menu/${itemFormulario.value.id}` : `${baseURL}/api/menu`
    const metodo = esEdicion.value ? 'PUT' : 'POST'
    
    const res = await fetch(url, { 
        method: metodo, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormulario.value) 
    })
    
    const data = await res.json()
    
    if (data.success) {
        await cargarMenus()
        dialogoFormulario.value = false
        mostrarMensaje(data.message, 'success')
        busqueda.value = ''
        if (actualizarMenuLateral) actualizarMenuLateral() 
    } else {
        mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje("Error de conexión con el servidor", "error")
  } finally {
    cargandoGuardar.value = false
  }
}

const confirmarEliminar = async () => {
  cargandoGuardar.value = true
  
  try {
    const res = await fetch(`${baseURL}/api/menu/${itemFormulario.value.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (data.success) {
        await cargarMenus()
        if (paginaActual.value > totalPaginas.value) paginaActual.value = totalPaginas.value
        dialogoEliminar.value = false
        mostrarMensaje(data.message, 'success')
        if (actualizarMenuLateral) actualizarMenuLateral() 
    } else {
        mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje("Error al eliminar el menú", "error")
  } finally {
    cargandoGuardar.value = false
  }
}
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
      <v-col cols="12" md="5">
        <h2 class="text-h5 font-weight-bold" style="color: #1867C0;">
          <v-icon color="#1867C0" class="mr-2">mdi-menu</v-icon>
          Gestión de Menús Principales
        </h2>
        <p class="text-grey-darken-1 text-caption mt-1">
          Administra las carpetas principales (Menús) que agruparán a los submódulos.
        </p>
      </v-col>

      <v-col cols="12" md="4">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar menú o ruta..."
          variant="outlined"
          density="compact"
          color="#1867C0"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="3" class="text-right">
        <v-btn v-if="permisosModuloActual.agregar" color="#1867C0" prepend-icon="mdi-plus" class="text-white font-weight-bold text-capitalize w-100" rounded="lg" elevation="2" @click="abrirCrear">
          Nuevo Menú
        </v-btn>
      </v-col>
    </v-row>

    <v-card elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>

      <v-table hover style="min-width: 800px;">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strNombreMenu')">
              Nombre del Menú
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strNombreMenu' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strRutaUrl')">
              Ruta Generada
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strRutaUrl' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 text-center" style="width: 180px; color: #1867C0;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.id">
            <td class="text-grey-darken-3 font-weight-bold pl-6">
              <v-icon size="small" color="blue-lighten-2" class="mr-2">mdi-folder</v-icon>
              {{ item.strNombreMenu }}
            </td>
            <td class="text-grey-darken-2 font-italic">
              {{ item.strRutaUrl }}
            </td>
            <td class="text-center">
              <v-btn v-if="permisosModuloActual.detalle" icon size="small" color="grey-darken-2" variant="text" @click="abrirDetalle(item)" title="Ver Detalle">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
              <v-btn v-if="permisosModuloActual.editar" icon size="small" color="#1867C0" variant="text" @click="abrirEditar(item)" title="Editar">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn v-if="permisosModuloActual.eliminar" icon size="small" color="red-darken-2" variant="text" @click="abrirEliminar(item)" title="Eliminar">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="3" class="text-center pa-8 text-grey">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">
                {{ busqueda ? 'mdi-file-search-outline' : 'mdi-menu-open' }}
              </v-icon><br>
              {{ busqueda ? `No se encontraron menús con "${busqueda}"` : 'Aún no hay menús registrados.' }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider></v-divider>

      <div v-if="totalPaginas > 1 || registros.length > 0" class="d-flex align-center justify-center pa-3 bg-white">
        <v-btn icon="mdi-chevron-double-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual = 1"></v-btn>
        <v-btn icon="mdi-chevron-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual--"></v-btn>
        <span class="mx-4 text-subtitle-2 text-grey-darken-2 font-weight-bold">Página {{ paginaActual }} de {{ totalPaginas }}</span>
        <v-btn icon="mdi-chevron-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual++"></v-btn>
        <v-btn icon="mdi-chevron-double-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual = totalPaginas"></v-btn>
      </div>
    </v-card>

    <v-dialog v-model="dialogoFormulario" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-white pa-4 d-flex align-center" style="background-color: #1867C0;">
          <v-icon start>mdi-menu</v-icon>
          {{ esEdicion ? 'Editar Menú' : 'Nuevo Menú' }}
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-form ref="formRef" v-model="valido" @submit.prevent>
            
            <div class="d-flex justify-space-between align-end mb-1">
              <span class="text-subtitle-2 text-grey-darken-2">Nombre del Menú Principal</span>
              <span class="text-caption font-weight-bold" :class="itemFormulario.strNombreMenu?.length === 50 ? 'text-red' : 'text-grey-darken-1'">
                {{ 50 - (itemFormulario.strNombreMenu?.length || 0) }} caracteres restantes
              </span>
            </div>

            <v-text-field 
              v-model="itemFormulario.strNombreMenu" 
              placeholder="Ej. Seguridad o Principal 1" 
              variant="outlined" 
              color="#1867C0" 
              density="compact"
              :rules="reglasNombre"
              counter 
              maxlength="50"
              class="mb-4"
              hide-details="auto"
              prepend-inner-icon="mdi-format-title"
            >
              <template v-slot:counter><span></span></template>
            </v-text-field>

            <div class="text-subtitle-2 mb-1 text-grey-darken-2">Ruta Base Autogenerada</div>
            <v-text-field 
              v-model="itemFormulario.strRutaUrl" 
              placeholder="Escribe el nombre para generar la ruta..." 
              variant="filled" 
              color="grey" 
              density="compact"
              class="mb-2"
              prepend-inner-icon="mdi-link-variant"
              readonly
              hint="Esta URL se usará como base para los submódulos"
              persistent-hint
            ></v-text-field>

          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4 border-top">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-2" variant="text" class="text-capitalize" @click="dialogoFormulario = false">Cancelar</v-btn>
          <v-btn color="#1867C0" variant="elevated" class="text-capitalize text-white" @click="guardarDatos" :loading="cargandoGuardar">
            <v-icon start>mdi-content-save</v-icon> {{ esEdicion ? 'Actualizar' : 'Guardar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoDetalle" max-width="450">
      <v-card rounded="xl">
        <v-card-title class="bg-grey-darken-3 text-white pa-4 d-flex align-center">
          <v-icon start>mdi-text-box-search-outline</v-icon>
          Detalles del Menú
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="dialogoDetalle = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-folder</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Nombre del Menú Principal</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ itemFormulario.strNombreMenu }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-link-variant</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Ruta Base Generada</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ itemFormulario.strRutaUrl }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="400" persistent>
      <v-card rounded="xl" class="text-center pa-4">
        <v-icon size="60" color="red-darken-2" class="mt-4 mb-2">mdi-alert-circle-outline</v-icon>
        <v-card-title class="text-h6 font-weight-bold text-grey-darken-4">¿Eliminar Menú?</v-card-title>
        <v-card-text class="text-grey-darken-1">
          Estás a punto de eliminar el menú <b>"{{ itemFormulario.strNombreMenu }}"</b>. No podrás hacerlo si ya tiene Módulos asignados.
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="grey-darken-2" variant="text" class="text-capitalize" @click="dialogoEliminar = false">Cancelar</v-btn>
          <v-btn color="red-darken-2" variant="elevated" class="text-capitalize px-6" @click="confirmarEliminar" :loading="cargandoGuardar">
            Sí, eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
.border-top {
  border-top: 1px solid #e0e0e0;
}
</style>