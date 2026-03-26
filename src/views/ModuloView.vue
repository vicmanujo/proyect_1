<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue' 
import { useRoute } from 'vue-router'

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
const actualizarMenuLateral = inject('actualizarMenuLateral')
const route = useRoute()

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC) DIRECTO AL BACKEND
// ==========================================
// Por defecto en true para que la tabla cargue mientras el backend responde
const permisosModuloActual = ref({ agregar: true, editar: true, eliminar: true, detalle: true })

const verificarPermisos = async () => {
  try {
    const usrStr = localStorage.getItem('usuario')
    if (!usrStr) return
    const usr = JSON.parse(usrStr)

    // Consultamos al backend los permisos reales de este usuario
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

// --- DATOS REALES DE LA BASE DE DATOS ---
const registros = ref([])
const menus = ref([]) 
const loading = ref(false)

// 🟢 SISTEMA DE NOTIFICACIONES (Reemplaza a los alert)
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
const ordenarPor = ref('strNombreModulo') 
const ordenAscendente = ref(true) 

// --- VARIABLES DE LOS MODALES ---
const dialogoFormulario = ref(false)
const dialogoDetalle = ref(false)
const dialogoEliminar = ref(false)

const esEdicion = ref(false)
const cargandoGuardar = ref(false)
const formRef = ref(null)
const valido = ref(false)

const itemFormulario = ref({
  id: null,
  idMenuPrincipal: null,
  strNombreModulo: '',
  strRutaUrl: ''
})

// Función helper para obtener el nombre del menú (Usada en tabla y ordenamiento)
const nombreMenuPadre = (idMenu) => {
  const menu = menus.value.find(m => m.id === idMenu)
  return menu ? menu.strNombreMenu : 'Sin Menú'
}

// ==========================================
// 🟢 FILTRADO Y ORDENAMIENTO INTELIGENTE
// ==========================================

const registrosFiltrados = computed(() => {
  if (!busqueda.value) return registros.value
  const textoMinusculas = busqueda.value.toLowerCase()
  return registros.value.filter(item => 
    item.strNombreModulo.toLowerCase().includes(textoMinusculas) ||
    item.strRutaUrl.toLowerCase().includes(textoMinusculas) ||
    nombreMenuPadre(item.idMenuPrincipal).toLowerCase().includes(textoMinusculas)
  )
})

const registrosOrdenados = computed(() => {
  return [...registrosFiltrados.value].sort((a, b) => {
    let valorA = a[ordenarPor.value]
    let valorB = b[ordenarPor.value]

    // Si ordenamos por el menú padre, comparamos por el NOMBRE del menú, no por su ID
    if (ordenarPor.value === 'idMenuPrincipal') {
      valorA = nombreMenuPadre(a.idMenuPrincipal).toLowerCase()
      valorB = nombreMenuPadre(b.idMenuPrincipal).toLowerCase()
    } else {
      if (typeof valorA === 'string') valorA = valorA.toLowerCase()
      if (typeof valorB === 'string') valorB = valorB.toLowerCase()
    }

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

const obtenerUrlDeMenuSeleccionado = (id) => {
  const menu = menus.value.find(m => m.id === id)
  return menu ? menu.strRutaUrl : ''
}

const generarSlug = (texto) => {
  if (!texto) return '';
  return texto.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
              .replace(/\s+/g, ''); 
}

watch(() => itemFormulario.value.strNombreModulo, (nuevoNombre) => {
    if (!nuevoNombre) {
        itemFormulario.value.strRutaUrl = ''
        return
    }
    itemFormulario.value.strNombreModulo = nuevoNombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\.]/g, '');
    
    const urlPadre = obtenerUrlDeMenuSeleccionado(itemFormulario.value.idMenuPrincipal);
    const urlHijo = generarSlug(itemFormulario.value.strNombreModulo);
    
    itemFormulario.value.strRutaUrl = (urlPadre || '') + '/' + urlHijo;
})

watch(() => itemFormulario.value.idMenuPrincipal, () => {
    if (itemFormulario.value.strNombreModulo) {
        const urlPadre = obtenerUrlDeMenuSeleccionado(itemFormulario.value.idMenuPrincipal);
        const urlHijo = generarSlug(itemFormulario.value.strNombreModulo);
        itemFormulario.value.strRutaUrl = (urlPadre || '') + '/' + urlHijo;
    }
})

// --- VALIDACIONES ---
const reglasSeleccion = [
  v => !!v || 'Debes seleccionar una opción'
]
const reglasNombre = [
  v => !!v || 'El nombre del módulo es obligatorio',
  v => (v && v.trim().length > 0) || 'No puede ser solo espacios',
  v => (v && v.length <= 50) || 'Máximo 50 caracteres'
]

// --- FUNCIONES CRUD ---

const cargarDatos = async () => {
  loading.value = true
  try {
    const [resModulos, resMenus] = await Promise.all([
      fetch(`${baseURL}/api/modulo`),
      fetch(`${baseURL}/api/menu`)
    ])
    registros.value = await resModulos.json()
    menus.value = await resMenus.json()
  } catch (error) {
    console.error("Error al cargar datos:", error)
    mostrarMensaje('Error al conectar con la base de datos', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await verificarPermisos() // 🟢 Validamos los permisos antes de cargar
  cargarDatos()
})

const abrirCrear = () => {
  itemFormulario.value = { id: null, idMenuPrincipal: null, strNombreModulo: '', strRutaUrl: '' }
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
  if (itemFormulario.value.strNombreModulo) {
    itemFormulario.value.strNombreModulo = itemFormulario.value.strNombreModulo.trim()
  }

  const { valid } = await formRef.value.validate()
  if (!valid) return

  // 🟢 VALIDACIÓN DE DUPLICADOS EN TIEMPO REAL
  const nombreIngresado = itemFormulario.value.strNombreModulo.toLowerCase()
  const esDuplicado = registros.value.some(modulo => 
    modulo.strNombreModulo.toLowerCase() === nombreIngresado && 
    modulo.id !== itemFormulario.value.id // Ignoramos el propio si estamos editando
  )

  if (esDuplicado) {
    mostrarMensaje(`El módulo "${itemFormulario.value.strNombreModulo}" ya está registrado en el sistema.`, 'error')
    return // Detenemos el proceso
  }

  cargandoGuardar.value = true

  try {
    const url = esEdicion.value ? `${baseURL}/api/modulo/${itemFormulario.value.id}` : `${baseURL}/api/modulo`
    const metodo = esEdicion.value ? 'PUT' : 'POST'
    
    const res = await fetch(url, { 
        method: metodo, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormulario.value) 
    })
    
    const data = await res.json()
    
    if (data.success) {
        await cargarDatos()
        dialogoFormulario.value = false
        mostrarMensaje(data.message, 'success')
        busqueda.value = '' // Limpiamos la búsqueda tras guardar
        if (actualizarMenuLateral) actualizarMenuLateral() 
    } else {
        mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje('Error de conexión con el servidor al guardar', 'error')
  } finally {
    cargandoGuardar.value = false
  }
}

const confirmarEliminar = async () => {
  cargandoGuardar.value = true
  
  try {
    const res = await fetch(`${baseURL}/api/modulo/${itemFormulario.value.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (data.success) {
        await cargarDatos()
        if (paginaActual.value > totalPaginas.value) paginaActual.value = totalPaginas.value
        dialogoEliminar.value = false
        mostrarMensaje(data.message, 'success')
        if (actualizarMenuLateral) actualizarMenuLateral() 
    } else {
        mostrarMensaje(data.message, 'error')
    }
  } catch (error) {
    console.error(error)
    mostrarMensaje('Error al eliminar el módulo', 'error')
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
          <v-icon color="#1867C0" class="mr-2">mdi-view-grid-plus</v-icon>
          Gestión de Módulos (Submenús)
        </h2>
        <p class="text-grey-darken-1 text-caption mt-1">
          Asigna los módulos a un Menú Principal y genera su URL de forma automática.
        </p>
      </v-col>

      <v-col cols="12" md="4">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar módulo o ruta..."
          variant="outlined"
          density="compact"
          color="#1867C0"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="3" class="text-right">
        <v-btn v-if="permisosModuloActual.agregar" color="#1867C0" prepend-icon="mdi-plus" class="text-white font-weight-bold text-capitalize w-100" rounded="lg" elevation="2" @click="abrirCrear" :disabled="menus.length === 0">
          Nuevo Módulo
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="menus.length === 0 && !loading" type="warning" variant="tonal" class="mb-4 text-caption border">
      <v-icon start>mdi-alert-circle</v-icon>
      Para crear un Módulo, primero debes registrar al menos un <b>Menú Principal</b> en el sistema.
    </v-alert>

    <v-card elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>

      <v-table hover style="min-width: 800px;">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('idMenuPrincipal')">
              Menú Principal
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'idMenuPrincipal' ? '#1867C0' : 'transparent'">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer" style="color: #1867C0;" @click="cambiarOrden('strNombreModulo')">
              Módulo (Submenú)
              <v-icon size="small" class="ml-1" :color="ordenarPor === 'strNombreModulo' ? '#1867C0' : 'transparent'">
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
            <td class="text-grey-darken-3 font-weight-medium pl-6">
              <v-icon size="small" color="grey" class="mr-1">mdi-menu</v-icon>
              {{ nombreMenuPadre(item.idMenuPrincipal) }}
            </td>
            <td class="text-grey-darken-3 font-weight-bold">
              <v-icon size="small" color="blue-lighten-2" class="mr-1">mdi-subdirectory-arrow-right</v-icon>
              {{ item.strNombreModulo }}
            </td>
            <td class="text-grey-darken-2 font-italic">
              {{ item.strRutaUrl }}
            </td>
            <td class="text-center">
              <v-btn v-if="permisosModuloActual.detalle" icon size="small" color="grey-darken-2" variant="text" @click="abrirDetalle(item)" title="Ver Detalle"><v-icon>mdi-eye</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.editar" icon size="small" color="#1867C0" variant="text" @click="abrirEditar(item)" title="Editar"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.eliminar" icon size="small" color="red-darken-2" variant="text" @click="abrirEliminar(item)" title="Eliminar"><v-icon>mdi-delete</v-icon></v-btn>
            </td>
          </tr>
          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="4" class="text-center pa-8 text-grey">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">
                {{ busqueda ? 'mdi-file-search-outline' : 'mdi-database-remove' }}
              </v-icon><br>
              {{ busqueda ? `No se encontraron módulos con "${busqueda}"` : 'Aún no hay módulos registrados.' }}
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
          <v-icon start>mdi-view-module-outline</v-icon>
          {{ esEdicion ? 'Editar Módulo' : 'Nuevo Módulo' }}
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-form ref="formRef" v-model="valido" @submit.prevent>
            
            <div class="text-subtitle-2 mb-1 text-grey-darken-2">Menú Principal (Padre)</div>
            <v-select
              v-model="itemFormulario.idMenuPrincipal"
              :items="menus"
              item-title="strNombreMenu"
              item-value="id"
              placeholder="Selecciona a qué menú pertenece"
              variant="outlined"
              color="#1867C0"
              density="compact"
              :rules="reglasSeleccion"
              class="mb-4"
              prepend-inner-icon="mdi-menu"
            ></v-select>

            <div class="d-flex justify-space-between align-end mb-1">
              <span class="text-subtitle-2 text-grey-darken-2">Nombre del Módulo (Submenú)</span>
              <span class="text-caption font-weight-bold" :class="itemFormulario.strNombreModulo?.length === 50 ? 'text-red' : 'text-grey-darken-1'">
                {{ 50 - (itemFormulario.strNombreModulo?.length || 0) }} caracteres restantes
              </span>
            </div>

            <v-text-field 
              v-model="itemFormulario.strNombreModulo" 
              placeholder="Ej. Principal 1.1" 
              variant="outlined" 
              color="#1867C0" 
              density="compact"
              :rules="reglasNombre"
              counter 
              maxlength="50"
              class="mb-4"
              hide-details="auto"
              prepend-inner-icon="mdi-format-title"
              :disabled="!itemFormulario.idMenuPrincipal"
            >
              <template v-slot:counter><span></span></template>
            </v-text-field>

            <div class="text-subtitle-2 mb-1 text-grey-darken-2">Ruta Autogenerada</div>
            <v-text-field 
              v-model="itemFormulario.strRutaUrl" 
              placeholder="Selecciona un menú padre y escribe el nombre..." 
              variant="filled" 
              color="grey" 
              density="compact"
              class="mb-2"
              prepend-inner-icon="mdi-link-variant"
              readonly
              hint="Esta URL se genera automáticamente"
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
          Detalles del Módulo
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="dialogoDetalle = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pa-6">
          <v-list density="compact">
            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-menu</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Menú Principal (Padre)</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ nombreMenuPadre(itemFormulario.idMenuPrincipal) }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-folder-outline</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Nombre del Módulo</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ itemFormulario.strNombreModulo }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2"></v-divider>

            <v-list-item>
              <template v-slot:prepend><v-icon color="#1867C0">mdi-link-variant</v-icon></template>
              <v-list-item-title class="text-caption text-grey">Ruta (URL)</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-grey-darken-4">{{ itemFormulario.strRutaUrl }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="400" persistent>
      <v-card rounded="xl" class="text-center pa-4">
        <v-icon size="60" color="red-darken-2" class="mt-4 mb-2">mdi-alert-circle-outline</v-icon>
        <v-card-title class="text-h6 font-weight-bold text-grey-darken-4">¿Eliminar Módulo?</v-card-title>
        <v-card-text class="text-grey-darken-1">
          Estás a punto de eliminar el módulo <b>"{{ itemFormulario.strNombreModulo }}"</b>. Esta acción es permanente.
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