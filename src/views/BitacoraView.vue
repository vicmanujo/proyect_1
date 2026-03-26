<template>
  <v-container>
    <v-card elevation="2" rounded="xl">
      <v-card-title class="pa-6 d-flex align-center">
        <v-icon color="blue-darken-3" class="mr-3">mdi-history</v-icon>
        <span class="text-h5 font-weight-bold">Bitácora de Movimientos</span>
        <v-spacer></v-spacer>
        <v-text-field
          v-model="busqueda"
          prepend-inner-icon="mdi-magnify"
          label="Buscar por usuario o acción..."
          variant="solo-filled"
          density="compact"
          hide-details
          rounded="lg"
          style="max-width: 300px;"
        ></v-text-field>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="logs"
        :search="busqueda"
        :loading="cargando"
        hover
        class="elevation-0"
      >
        <template v-slot:item.accion="{ item }">
          <v-chip
            :color="colorAccion(item.accion)"
            size="small"
            class="font-weight-bold text-uppercase"
          >
            {{ item.accion }}
          </v-chip>
        </template>
        
        <template v-slot:item.fechaRegistro="{ item }">
          {{ new Date(item.fechaRegistro).toLocaleString() }}
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const busqueda = ref('')
const logs = ref([])
const cargando = ref(true)

const headers = [
  { title: 'Fecha', key: 'fechaRegistro', sortable: true },
  { title: 'Usuario', key: 'strUsuario' },
  { title: 'Acción', key: 'accion' },
  { title: 'Módulo', key: 'modulo' },
  { title: 'Detalle', key: 'detalle' },
  { title: 'IP', key: 'ip' },
]

const colorAccion = (accion) => {
  if (accion === 'DELETE') return 'red'
  if (accion === 'INSERT') return 'green'
  if (accion === 'UPDATE') return 'orange'
  if (accion === 'LOGIN') return 'blue'
  return 'grey'
}

onMounted(async () => {
  try {
    const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
    const res = await fetch(`${baseURL}/api/bitacora`) // Debes crear esta ruta GET en tu backend
    const data = await res.json()
    if (data.success) logs.value = data.logs
  } catch (err) {
    console.error(err)
  } finally {
    cargando.value = false
  }
})
</script>