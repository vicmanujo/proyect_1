<script setup>
import { ref, onMounted } from 'vue';
import VueRecaptcha from 'vue3-recaptcha2';

// Detectar entorno (Local vs Vercel)
const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables reactivas
const listaRegistros = ref([]);
const mensaje = ref('');
const loading = ref(false);

// TU CLAVE DE SITIO
const siteKey = "6LfChlEsAAAAAMY9tP_3GcHTajCZjlZsvo4RaWyk"; 

// Función auxiliar para que la fecha se vea bonita (Ej: 22/01/2026 03:30 PM)
const formatearFecha = (fechaString) => {
  if (!fechaString) return '';
  const fecha = new Date(fechaString);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(fecha);
};

// 1. Validar Captcha
const onVerify = async (token) => {
  loading.value = true;
  mensaje.value = "Verificando...";

  try {
    const respuesta = await fetch(`${baseURL}/api/validar-insertar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const datos = await respuesta.json();

    if (datos.success) {
      mensaje.value = "¡Éxito! Datos guardados correctamente.";
      cargarRegistros(); 
    } else {
      mensaje.value = "Error: " + datos.message;
    }
  } catch (error) {
    console.error(error);
    mensaje.value = "Error de conexión con el servidor.";
  } finally {
    loading.value = false;
  }
};

// 2. Cargar datos
const cargarRegistros = async () => {
  try {
    const res = await fetch(`${baseURL}/api/obtener-datos`);
    const data = await res.json();
    listaRegistros.value = data;
  } catch (error) {
    console.error("No se pudieron cargar los datos", error);
  }
};

onMounted(() => {
  cargarRegistros();
});
</script>

<template>
  <v-container class="fill-height flex-column align-center justify-start pt-10">
    
    <div class="text-center mb-8">
      <v-icon icon="mdi-shield-lock" color="#1867C0" size="50" class="mb-2"></v-icon>
      <h1 class="text-h4 font-weight-bold" style="color: #1867C0;">
        Seguridad y Datos
      </h1>
      <p class="text-subtitle-1 text-grey-darken-1">
        Validación con Google ReCaptcha v2
      </p>
    </div>

    <v-card 
      width="100%" 
      max-width="480" 
      elevation="6" 
      rounded="xl" 
      class="pa-6 mb-12 text-center border-t-lg"
      style="border-color: #42b883 !important;" 
    >
      <h3 class="text-h6 mb-4 text-blue-grey-darken-2 font-weight-bold">
        Demuestra que eres humano
      </h3>
      
      <div class="d-flex justify-center my-4">
        <VueRecaptcha
          :sitekey="siteKey"
          @verify="onVerify"
        />
      </div>

      <v-expand-transition>
        <div v-if="mensaje">
          <v-alert 
            :type="mensaje.includes('Éxito') ? 'success' : 'error'" 
            variant="tonal"
            density="compact"
            class="mt-4 rounded-lg font-weight-medium"
          >
            {{ mensaje }}
          </v-alert>
        </div>
      </v-expand-transition>
      
      <v-fade-transition>
        <div v-if="loading" class="mt-4">
            <v-progress-circular indeterminate color="#42b883" size="30"></v-progress-circular>
            <span class="ml-3 text-caption text-grey">Procesando...</span>
        </div>
      </v-fade-transition>
    </v-card>

    <div class="w-100" style="max-width: 900px;">
      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-database" color="#1867C0" class="mr-2"></v-icon>
        <h2 class="text-h5 text-blue-darken-3 font-weight-bold">
          Registros en Base de Datos
        </h2>
      </div>

      <v-card elevation="3" rounded="lg" overflow-hidden>
        <v-table hover density="comfortable">
          <thead>
            <tr style="background-color: #1867C0;">
              <th class="text-white text-uppercase font-weight-bold text-left">ID</th>
              <th class="text-white text-uppercase font-weight-bold text-left">Texto de Prueba</th>
              <th class="text-white text-uppercase font-weight-bold text-right">Fecha de Registro</th>
            </tr>
          </thead>
          
          <tbody>
            <tr v-for="item in listaRegistros" :key="item.ID">
              <td class="font-weight-bold text-grey-darken-2">{{ item.ID }}</td>
              <td>
                <v-chip size="small" color="blue-lighten-4" class="text-blue-darken-4 font-weight-bold">
                   {{ item.TextoPrueba }}
                </v-chip>
              </td>
              <td class="text-right text-grey-darken-1">
                {{ formatearFecha(item.FechaRegistro) }}
              </td>
            </tr>

            <tr v-if="listaRegistros.length === 0">
              <td colspan="3" class="text-center pa-10">
                <v-icon icon="mdi-database-off" size="large" color="grey-lighten-1" class="mb-2"></v-icon>
                <div class="text-grey">No hay registros para mostrar</div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
      
      <div class="text-caption text-right mt-2 text-grey">
        Conectado a MonsterASP SQL Server
      </div>
    </div>

  </v-container>
</template>

<style scoped>
/* Un borde superior verde bonito para la tarjeta del captcha */
.border-t-lg {
  border-top: 6px solid;
}
</style>