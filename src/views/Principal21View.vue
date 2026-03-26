<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''

// ==========================================
// 🔐 1. SISTEMA DE PERMISOS (RBAC) DIRECTO AL BACKEND
// ==========================================
// Arrancamos todo en 'true' para no parpadear la interfaz mientras carga
const permisosModuloActual = ref({
  consulta: true,
  agregar: true,
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
        // En los estáticos también leemos el bitConsulta para ocultar la tabla entera si no tiene acceso
        permisosModuloActual.value = {
          consulta: true, // Si el backend lo mandó, es porque sí puede consultar
          agregar: moduloEncontrado.permisos.agregar,
          editar: moduloEncontrado.permisos.editar,
          eliminar: moduloEncontrado.permisos.eliminar,
          detalle: moduloEncontrado.permisos.detalle
        }
      } else {
        // Si no lo encuentra, bloqueamos la consulta
        permisosModuloActual.value.consulta = false
      }
    }
  } catch (error) {
    console.error("Error al verificar permisos:", error)
  }
}

// --- DATOS ESTÁTICOS: INVENTARIO ---
const registros = ref([
  { id: 1, strCodigo: 'PROD-001', strProducto: 'Laptop HP Core i7', numStock: 15, estado: 'Disponible' },
  { id: 2, strCodigo: 'PROD-002', strProducto: 'Monitor Dell 24"', numStock: 0, estado: 'Agotado' },
  { id: 3, strCodigo: 'PROD-003', strProducto: 'Teclado Mecánico', numStock: 5, estado: 'Por Resurtir' },
  { id: 4, strCodigo: 'PROD-004', strProducto: 'Mouse Inalámbrico', numStock: 12, estado: 'Disponible' },
  { id: 5, strCodigo: 'PROD-005', strProducto: 'Cable HDMI 2M', numStock: 30, estado: 'Disponible' },
  { id: 6, strCodigo: 'PROD-006', strProducto: 'Adaptador USB-C', numStock: 8, estado: 'Disponible' }
])

const loading = ref(false)
const snackbar = ref({ show: false, mensaje: '', color: 'success', icono: 'mdi-check-circle' })
const mostrarMensaje = (mensaje, tipo = 'success') => {
  snackbar.value.mensaje = mensaje
  snackbar.value.color = tipo === 'success' ? '#4CAF50' : '#E53935' 
  snackbar.value.icono = tipo === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
  snackbar.value.show = true
}

const busqueda = ref('')
const ordenarPor = ref('id') 
const ordenAscendente = ref(false) 

const dialogoFormulario = ref(false)
const dialogoDetalle = ref(false)
const dialogoEliminar = ref(false)
const esEdicion = ref(false)
const formRef = ref(null)
const valido = ref(false)

const itemFormulario = ref({ id: null, strCodigo: '', strProducto: '', numStock: null, estado: 'Disponible' })

const reglasTexto = [v => !!v || 'Obligatorio', v => (v && v.trim().length > 0) || 'No vacío']
const reglasNumero = [v => v !== null && v !== '' || 'Obligatorio', v => !isNaN(v) || 'Debe ser número', v => v >= 0 || 'No negativos']

const registrosFiltrados = computed(() => {
  if (!busqueda.value) return registros.value
  const txt = busqueda.value.toLowerCase()
  return registros.value.filter(item => item.strCodigo.toLowerCase().includes(txt) || item.strProducto.toLowerCase().includes(txt))
})

const registrosOrdenados = computed(() => {
  return [...registrosFiltrados.value].sort((a, b) => {
    let vA = a[ordenarPor.value], vB = b[ordenarPor.value]
    if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = (typeof vB === 'string') ? vB.toLowerCase() : '' }
    if (vA < vB) return ordenAscendente.value ? -1 : 1
    if (vA > vB) return ordenAscendente.value ? 1 : -1
    return 0
  })
})

const cambiarOrden = (columna) => {
  if (ordenarPor.value === columna) ordenAscendente.value = !ordenAscendente.value 
  else { ordenarPor.value = columna; ordenAscendente.value = true }
}

const paginaActual = ref(1)
const elementosPorPagina = 5
const totalPaginas = computed(() => Math.ceil(registrosOrdenados.value.length / elementosPorPagina) || 1)
const registrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * elementosPorPagina
  return registrosOrdenados.value.slice(inicio, inicio + elementosPorPagina)
})

onMounted(() => {
  verificarPermisos() // 🟢 Dispara la verificación al entrar
})

const abrirCrear = () => {
  itemFormulario.value = { id: null, strCodigo: `PROD-00${registros.value.length + 1}`, strProducto: '', numStock: null, estado: 'Disponible' }
  esEdicion.value = false; dialogoFormulario.value = true
}
const abrirEditar = (item) => { itemFormulario.value = { ...item }; esEdicion.value = true; dialogoFormulario.value = true }
const abrirDetalle = (item) => { itemFormulario.value = { ...item }; dialogoDetalle.value = true }
const abrirEliminar = (item) => { itemFormulario.value = { ...item }; dialogoEliminar.value = true }

const guardarDatos = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  setTimeout(() => {
    if (esEdicion.value) {
      const idx = registros.value.findIndex(r => r.id === itemFormulario.value.id)
      if (idx !== -1) registros.value[idx] = { ...itemFormulario.value }
    } else {
      const nuevoId = registros.value.length ? Math.max(...registros.value.map(r => r.id)) + 1 : 1
      registros.value.push({ ...itemFormulario.value, id: nuevoId })
    }
    dialogoFormulario.value = false; loading.value = false; mostrarMensaje('Guardado Estático', 'success')
  }, 500)
}

const confirmarEliminar = () => {
  loading.value = true
  setTimeout(() => {
    registros.value = registros.value.filter(r => r.id !== itemFormulario.value.id)
    if (paginaActual.value > totalPaginas.value) paginaActual.value = totalPaginas.value
    dialogoEliminar.value = false; loading.value = false; mostrarMensaje('Eliminado Estático', 'success')
  }, 500)
}
</script>

<template>
  <v-container fluid class="pa-6">
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" :timeout="4000" elevation="10" rounded="pill">
      <div class="d-flex align-center text-white"><v-icon start class="mr-2">{{ snackbar.icono }}</v-icon><b>{{ snackbar.mensaje }}</b></div>
    </v-snackbar>

    <v-row align="center" justify="space-between" class="mb-4">
      <v-col cols="12" md="5">
        <h2 class="text-h5 font-weight-bold text-blue-darken-3"><v-icon class="mr-2">mdi-package-variant</v-icon>Módulo Principal 1.2 (Inventario)</h2>
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field v-if="permisosModuloActual.consulta" v-model="busqueda" placeholder="Buscar producto..." variant="outlined" density="compact" color="#1867C0" prepend-inner-icon="mdi-magnify" hide-details clearable></v-text-field>
      </v-col>
      <v-col cols="12" md="3" class="text-right">
        <v-btn v-if="permisosModuloActual.consulta && permisosModuloActual.agregar" color="#1867C0" prepend-icon="mdi-plus" class="text-white font-weight-bold text-capitalize w-100" rounded="lg" @click="abrirCrear">Nuevo Producto</v-btn>
      </v-col>
    </v-row>

    <v-card v-if="!permisosModuloActual.consulta" elevation="0" border class="pa-10 text-center bg-grey-lighten-4 rounded-xl">
      <v-icon size="60" color="grey">mdi-lock-outline</v-icon><h3 class="text-grey-darken-1">Acceso Restringido</h3>
      <p class="text-caption text-grey">No tienes permisos para visualizar la información de este módulo.</p>
    </v-card>

    <v-card v-else elevation="4" rounded="xl" border class="overflow-x-auto position-relative">
      <v-progress-linear v-if="loading" indeterminate color="#1867C0" class="position-absolute w-100" style="top: 0; z-index: 10;"></v-progress-linear>
      <v-table hover style="min-width: 800px;">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="font-weight-bold text-subtitle-2 pl-6 cursor-pointer text-blue-darken-3" @click="cambiarOrden('strCodigo')">Código <v-icon size="small">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon></th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer text-blue-darken-3" @click="cambiarOrden('strProducto')">Producto <v-icon size="small">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon></th>
            <th class="font-weight-bold text-subtitle-2 cursor-pointer text-blue-darken-3" @click="cambiarOrden('numStock')">Stock <v-icon size="small">{{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon></th>
            <th class="font-weight-bold text-subtitle-2 text-center text-blue-darken-3">Estado</th>
            <th class="font-weight-bold text-subtitle-2 text-center text-blue-darken-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.id">
            <td class="pl-6 font-weight-bold text-grey-darken-3">{{ item.strCodigo }}</td>
            <td class="text-grey-darken-2">{{ item.strProducto }}</td>
            <td class="font-weight-medium">{{ item.numStock }} uds.</td>
            <td class="text-center">
              <v-chip :color="item.numStock > 0 ? 'success' : 'red'" size="small" variant="flat">{{ item.numStock > 0 ? 'Disponible' : 'Agotado' }}</v-chip>
            </td>
            <td class="text-center">
              <v-btn v-if="permisosModuloActual.detalle" icon size="small" color="grey-darken-2" variant="text" @click="abrirDetalle(item)"><v-icon>mdi-eye</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.editar" icon size="small" color="#1867C0" variant="text" @click="abrirEditar(item)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn v-if="permisosModuloActual.eliminar" icon size="small" color="red-darken-2" variant="text" @click="abrirEliminar(item)"><v-icon>mdi-delete</v-icon></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-divider></v-divider>
      <div v-if="totalPaginas > 1 || registros.length > 0" class="d-flex align-center justify-center pa-3 bg-white">
        <v-btn icon="mdi-chevron-double-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual = 1"></v-btn>
        <v-btn icon="mdi-chevron-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual--"></v-btn>
        <span class="mx-4 text-subtitle-2 text-grey-darken-2">Pág {{ paginaActual }} de {{ totalPaginas }}</span>
        <v-btn icon="mdi-chevron-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual++"></v-btn>
        <v-btn icon="mdi-chevron-double-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual = totalPaginas"></v-btn>
      </div>
    </v-card>

    <v-dialog v-model="dialogoFormulario" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="bg-blue-darken-3 text-white pa-4"><v-icon start>mdi-package</v-icon> {{ esEdicion ? 'Editar' : 'Nuevo' }}</v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="formRef" v-model="valido" @submit.prevent>
            <v-text-field v-model="itemFormulario.strCodigo" label="Código" readonly variant="outlined" density="compact" class="mb-2" bg-color="grey-lighten-4"></v-text-field>
            <v-text-field v-model="itemFormulario.strProducto" :rules="reglasTexto" label="Producto" variant="outlined" density="compact" class="mb-2"></v-text-field>
            <v-text-field v-model.number="itemFormulario.numStock" :rules="reglasNumero" label="Stock" type="number" variant="outlined" density="compact" class="mb-2"></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer><v-btn @click="dialogoFormulario = false">Cancelar</v-btn><v-btn color="#1867C0" variant="elevated" @click="guardarDatos" :loading="loading">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoDetalle" max-width="400">
      <v-card rounded="xl">
        <v-card-title class="bg-grey-darken-3 text-white pa-4">Detalle de Producto</v-card-title>
        <v-card-text class="pa-6">
          <p><b>Código:</b> {{ itemFormulario.strCodigo }}</p>
          <p><b>Producto:</b> {{ itemFormulario.strProducto }}</p>
          <p><b>Stock:</b> {{ itemFormulario.numStock }} unidades</p>
        </v-card-text>
        <v-card-actions><v-spacer></v-spacer><v-btn color="grey" @click="dialogoDetalle = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="400" persistent>
      <v-card rounded="xl" class="text-center pa-4">
        <v-icon size="60" color="red" class="mb-2">mdi-alert-circle</v-icon>
        <v-card-title>¿Eliminar?</v-card-title>
        <v-card-text>Borrarás <b>{{ itemFormulario.strProducto }}</b>.</v-card-text>
        <v-card-actions class="justify-center">
          <v-btn @click="dialogoEliminar = false">Cancelar</v-btn><v-btn color="red" variant="elevated" @click="confirmarEliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>