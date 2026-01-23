<script setup>
import { ref, onMounted } from 'vue';

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';
const registros = ref([]);
const loading = ref(true);

// Función para formatear fecha bonita
const formatearFecha = (fechaString) => {
  if (!fechaString) return '';
  return new Date(fechaString).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

const cargarContactos = async () => {
  try {
    const res = await fetch(`${baseURL}/api/contactos`);
    registros.value = await res.json();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  cargarContactos();
});
</script>

<template>
  <v-container class="fill-height d-flex flex-column align-center justify-start pt-10">
    
    <div class="text-center mb-8">
      <v-avatar color="#42b883" size="50" class="mb-3 elevation-2">
        <v-icon color="white">mdi-database-search</v-icon>
      </v-avatar>
      <h2 class="text-h4 font-weight-bold text-grey-darken-3">Registros Recibidos</h2>
      <p class="text-subtitle-1 text-grey">Datos del formulario de contacto</p>
    </div>

    <v-card 
      elevation="10" 
      rounded="xl" 
      width="100%" 
      max-width="1000"
      border
      class="overflow-hidden"
    >
      <v-table fixed-header height="500px" hover>
        <thead>
          <tr style="background-color: #42b883;">
            <th class="text-white font-weight-bold">ID</th>
            <th class="text-white font-weight-bold">Nombre</th>
            <th class="text-white font-weight-bold">Contacto</th>
            <th class="text-white font-weight-bold">Nacimiento</th>
            <th class="text-white font-weight-bold">Mensaje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registros" :key="item.ID">
            <td class="font-weight-bold text-grey">{{ item.ID }}</td>
            
            <td class="text-capitalize">{{ item.Nombre }}</td>
            
            <td>
              <div class="d-flex flex-column py-2">
                <small class="text-grey-darken-2">
                    <v-icon size="small" start>mdi-email</v-icon>{{ item.Correo }}
                </small>
                <small class="text-grey-darken-2 mt-1">
                    <v-icon size="small" start>mdi-phone</v-icon>{{ item.Telefono }}
                </small>
              </div>
            </td>

            <td>{{ formatearFecha(item.FechaNacimiento) }}</td>
            
            <td style="max-width: 200px;">
              <v-tooltip location="top" :text="item.Mensaje">
                <template v-slot:activator="{ props }">
                  <div v-bind="props" class="text-truncate cursor-pointer text-grey-darken-2">
                    {{ item.Mensaje }}
                  </div>
                </template>
              </v-tooltip>
            </td>
          </tr>

          <tr v-if="registros.length === 0 && !loading">
            <td colspan="5" class="text-center pa-10 text-grey">
              No hay registros aún
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <div class="mt-6">
      <v-btn to="/formulario" color="grey-darken-3" variant="text">
        <v-icon start>mdi-arrow-left</v-icon> Volver al Formulario
      </v-btn>
    </div>

  </v-container>
</template>

<style scoped>
/* Cursor manita para el mensaje */
.cursor-pointer {
    cursor: pointer;
}
</style>