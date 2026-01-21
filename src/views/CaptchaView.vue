<script setup>
import { ref, onMounted } from 'vue';
import VueRecaptcha from 'vue3-recaptcha2';

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Variables reactivas
const listaRegistros = ref([]);
const mensaje = ref('');
const loading = ref(false);

// TU CLAVE DE SITIO
const siteKey = "6LfChlEsAAAAAMY9tP_3GcHTajCZjlZsvo4RaWyk"; 

// 🟢 CORRECCIÓN 1: Definimos baseURL AQUÍ AFUERA para que todos la puedan usar
// Si es modo DEV (Local), usa localhost:3000. Si es Producción (Vercel), usa ruta relativa.


// 1. Función cuando el usuario resuelve el captcha
const onVerify = async (token) => {
  loading.value = true;
  mensaje.value = "Verificando...";

  try {
    // 🟢 CORRECCIÓN 2: Usamos comillas invertidas (``) para que funcione la variable
    const respuesta = await fetch(`${baseURL}/api/validar-insertar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const datos = await respuesta.json();

    if (datos.success) {
      mensaje.value = "¡Éxito! Datos guardados en SQL Server.";
      cargarRegistros(); // Recargar la tabla
    } else {
      mensaje.value = "Error: " + datos.message;
    }
  } catch (error) {
    console.error(error); // Es bueno ver el error en consola
    mensaje.value = "Error de conexión con el servidor.";
  } finally {
    loading.value = false;
  }
};

// 2. Función para cargar la tabla desde la BD
const cargarRegistros = async () => {
  try {
    // 🟢 Aquí también usamos comillas invertidas
    const res = await fetch(`${baseURL}/api/obtener-datos`);
    const data = await res.json();
    listaRegistros.value = data;
  } catch (error) {
    console.error("No se pudieron cargar los datos", error);
  }
};

// Al entrar a la pantalla, cargamos la tabla
onMounted(() => {
  cargarRegistros();
});
</script>

<template>
  <v-container>
    <h1 class="text-h4 mb-5 text-center">Seguridad y Base de Datos</h1>

    <v-card class="mx-auto pa-5 mb-10" max-width="500" elevation="4">
      <div class="text-center">
        <p class="mb-4">Demuestra que no eres un robot para insertar datos:</p>
        
        <div class="d-flex justify-center">
            <VueRecaptcha
                :sitekey="siteKey"
                @verify="onVerify"
            />
        </div>

        <v-alert v-if="mensaje" :type="mensaje.includes('Éxito') ? 'success' : 'info'" class="mt-4">
          {{ mensaje }}
        </v-alert>
        
        <v-progress-circular v-if="loading" indeterminate color="primary" class="mt-2"></v-progress-circular>
      </div>
    </v-card>

    <h2 class="text-h5 mb-3">Registros en SQL Server (MonsterASP)</h2>
    
    <v-table theme="dark">
      <thead>
        <tr>
          <th class="text-left">ID</th>
          <th class="text-left">Texto de Prueba</th>
          <th class="text-left">Fecha Registro</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in listaRegistros" :key="item.ID">
          <td>{{ item.ID }}</td> <td>{{ item.TextoPrueba }}</td>
          <td>{{ item.FechaRegistro }}</td>
        </tr>
        <tr v-if="listaRegistros.length === 0">
          <td colspan="3" class="text-center">No hay registros o no hay conexión</td>
        </tr>
      </tbody>
    </v-table>

  </v-container>
</template>