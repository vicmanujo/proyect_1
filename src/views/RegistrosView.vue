<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // 🟢 Importamos watch

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';
const registros = ref([]);
const loading = ref(true);

// --- VARIABLES PARA FILTROS ---
const busqueda = ref('');       
const fechaInicio = ref(null);  
const fechaFin = ref(null);     

// --- VARIABLES PARA PAGINACIÓN Y ORDEN ---
const paginaActual = ref(1);
const elementosPorPagina = 5;
const ordenColumna = ref('Nombre'); // Columna por defecto a ordenar
const ordenAscendente = ref(true);  // true = A-Z, false = Z-A

// Variables del Formulario Modal
const dialogoFormulario = ref(false);
const itemFormulario = ref({}); 
const cargandoGuardar = ref(false);
const esEdicion = ref(false);
const formDialog = ref(null); 
const valido = ref(false);

const fechaMax = computed(() => {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0];
});

// --- LÓGICA DE FILTRADO ---
const registrosFiltrados = computed(() => {
    return registros.value.filter(item => {
        const texto = busqueda.value.toLowerCase();
        const coincideTexto = 
            item.Nombre.toLowerCase().includes(texto) ||
            item.Correo.toLowerCase().includes(texto) ||
            item.Telefono.includes(texto);

        let coincideFecha = true;
        if (fechaInicio.value && fechaFin.value && item.FechaNacimiento) {
            const fechaItem = new Date(item.FechaNacimiento).setHours(0,0,0,0);
            const fInicio = new Date(fechaInicio.value).setHours(0,0,0,0);
            const fFin = new Date(fechaFin.value).setHours(0,0,0,0);
            coincideFecha = fechaItem >= fInicio && fechaItem <= fFin;
        }
        return coincideTexto && coincideFecha;
    });
});

// --- 🟢 NUEVA LÓGICA: ORDENAMIENTO ---
const registrosOrdenados = computed(() => {
    // Hacemos una copia del array filtrado para ordenarlo
    let resultado = [...registrosFiltrados.value];
    
    if (ordenColumna.value) {
        resultado.sort((a, b) => {
            let valA = a[ordenColumna.value];
            let valB = b[ordenColumna.value];

            // Convertir a minúsculas para ordenar bien las letras
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return ordenAscendente.value ? -1 : 1;
            if (valA > valB) return ordenAscendente.value ? 1 : -1;
            return 0;
        });
    }
    return resultado;
});

// --- 🟢 NUEVA LÓGICA: PAGINACIÓN ---
const totalPaginas = computed(() => {
    return Math.ceil(registrosOrdenados.value.length / elementosPorPagina) || 1;
});

const registrosPaginados = computed(() => {
    const inicio = (paginaActual.value - 1) * elementosPorPagina;
    const fin = inicio + elementosPorPagina;
    return registrosOrdenados.value.slice(inicio, fin); // Extraemos solo los 5 correspondientes
});

// Si el usuario busca algo, regresamos a la página 1 automáticamente
watch([busqueda, fechaInicio, fechaFin], () => {
    paginaActual.value = 1;
});

// Función para cambiar la columna de orden
const cambiarOrden = (columna) => {
    if (ordenColumna.value === columna) {
        ordenAscendente.value = !ordenAscendente.value; // Invierte el orden si ya estaba seleccionada
    } else {
        ordenColumna.value = columna;
        ordenAscendente.value = true; // Nuevo ordenamiento empieza A-Z
    }
    paginaActual.value = 1; // Al reordenar, volvemos a la pag 1
};


// --- REGLAS DE VALIDACIÓN ---
const reglasNombre = [
  v => !!v || 'El nombre es obligatorio',
  v => (v && v.trim().length > 0) || 'El nombre no puede ser solo espacios',
  v => (v && v.length <= 60) || 'Máximo 60 caracteres',
  v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v) || 'Solo se permiten letras'
];

const reglasCorreo = [
  v => !!v || 'El correo es obligatorio',
  v => /.+@.+\..+/.test(v) || 'Correo inválido'
];

const reglasTelefono = [
  v => !!v || 'El teléfono es obligatorio',
  v => (v && v.length === 10) || 'Exactamente 10 dígitos'
];

const reglasMensaje = [
  v => !!v || 'El mensaje es obligatorio',
  v => (v && v.length <= 300) || 'Máximo 300 caracteres'
];

const reglasFecha = [
  v => !!v || 'La fecha es obligatoria',
  v => {
      if (!v) return true;
      return v <= fechaMax.value || 'No puedes seleccionar una fecha futura';
  }
];

const cargarContactos = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${baseURL}/api/contactos`);
    registros.value = await res.json();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const eliminarItem = async (id) => {
  if (!confirm('¿Estás seguro de borrar este registro?')) return;
  try {
    const res = await fetch(`${baseURL}/api/eliminar-contacto/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        registros.value = registros.value.filter(item => item.ID !== id);
        // Ajustar paginación si borramos el último item de la página
        if (paginaActual.value > totalPaginas.value) {
            paginaActual.value = totalPaginas.value;
        }
    }
  } catch (error) {
    console.error(error);
  }
}

const abrirCrear = () => {
    itemFormulario.value = {}; 
    esEdicion.value = false;   
    dialogoFormulario.value = true;
}

const abrirEditar = (item) => {
    itemFormulario.value = { ...item }; 
    if (itemFormulario.value.FechaNacimiento) {
        itemFormulario.value.FechaNacimiento = itemFormulario.value.FechaNacimiento.split('T')[0];
    }
    esEdicion.value = true;            
    dialogoFormulario.value = true;
}

const guardarDatos = async () => {
    if(itemFormulario.value.Nombre) itemFormulario.value.Nombre = itemFormulario.value.Nombre.trim();
    
    const { valid } = await formDialog.value.validate();
    if (!valid) return; 

    cargandoGuardar.value = true;
    
    try {
        let url = '';
        let metodo = '';

        if (esEdicion.value) {
            url = `${baseURL}/api/actualizar-contacto/${itemFormulario.value.ID}`;
            metodo = 'PUT';
        } else {
            url = `${baseURL}/api/guardar-contacto`;
            metodo = 'POST';
            
            itemFormulario.value = {
                nombre: itemFormulario.value.Nombre, 
                correo: itemFormulario.value.Correo,
                telefono: itemFormulario.value.Telefono,
                mensaje: itemFormulario.value.Mensaje,
                fechaNacimiento: itemFormulario.value.FechaNacimiento,
                ...itemFormulario.value 
            };
        }

        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemFormulario.value)
        });

        const data = await res.json();

        if (data.success) {
            if (!esEdicion.value) {
                await cargarContactos(); 
            } else {
                const index = registros.value.findIndex(r => r.ID === itemFormulario.value.ID);
                if (index !== -1) {
                    registros.value[index] = { 
                        ...registros.value[index], 
                        ...itemFormulario.value 
                    };
                }
            }
            dialogoFormulario.value = false;
        } else {
            alert('Error del servidor: ' + data.message);
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    } finally {
        cargandoGuardar.value = false;
    }
}

const limpiarFiltros = () => {
    busqueda.value = '';
    fechaInicio.value = null;
    fechaFin.value = null;
}

onMounted(() => {
  cargarContactos();
});
</script>

<template>
  <v-container class="fill-height d-flex flex-column align-center justify-start pt-10">
    
    <div class="text-center mb-6">
      <v-avatar color="#42b883" size="50" class="mb-3 elevation-2">
        <v-icon color="white">mdi-database-search</v-icon>
      </v-avatar>
      <h2 class="text-h4 font-weight-bold text-grey-darken-3">Crud</h2>
    </div>

    <v-card width="100%" max-width="1100" class="mb-6 pa-5" elevation="3" rounded="xl">
        <v-row dense>
            <v-col cols="12">
                <v-text-field
                    v-model="busqueda"
                    label="Buscar por palabra clave (Nombre, Correo, Teléfono)"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="comfortable"
                    color="#42b883"
                    hide-details
                    clearable
                    class="mb-2"
                ></v-text-field>
            </v-col>
        </v-row>

        <v-row dense align="center">
            <v-col cols="12" md="4">
                <v-text-field
                    v-model="fechaInicio"
                    label="Desde fecha"
                    type="date"
                    variant="outlined"
                    density="compact"
                    color="#42b883"
                    hide-details
                ></v-text-field>
            </v-col>

            <v-col cols="12" md="4">
                <v-text-field
                    v-model="fechaFin"
                    label="Hasta fecha"
                    type="date"
                    variant="outlined"
                    density="compact"
                    color="#42b883"
                    hide-details
                ></v-text-field>
            </v-col>

            <v-col cols="12" md="4" class="d-flex justify-end gap-2 align-center">
                 <v-btn variant="tonal" color="grey-darken-1" @click="limpiarFiltros" prepend-icon="mdi-filter-off" class="text-capitalize">
                    Limpiar
                </v-btn>

                <v-btn color="#42b883" prepend-icon="mdi-plus" class="text-white font-weight-bold" elevation="2" @click="abrirCrear">
                    Nuevo
                </v-btn>
            </v-col>
        </v-row>
    </v-card>

    <v-card elevation="10" rounded="xl" width="100%" max-width="1100" border class="overflow-x-auto">
      <v-table hover style="min-width: 900px;">
        <thead>
          <tr style="background-color: #35495e;">
            
            <th class="text-white font-weight-bold pl-6 cursor-pointer hover-bg" @click="cambiarOrden('Nombre')">
              Nombre
              <v-icon size="small" v-if="ordenColumna === 'Nombre'" class="ml-1">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            
            <th class="text-white font-weight-bold cursor-pointer hover-bg" @click="cambiarOrden('Correo')">
              Contacto
              <v-icon size="small" v-if="ordenColumna === 'Correo'" class="ml-1">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>
            
            <th class="text-white font-weight-bold cursor-pointer hover-bg" @click="cambiarOrden('FechaNacimiento')">
              Nacimiento
              <v-icon size="small" v-if="ordenColumna === 'FechaNacimiento'" class="ml-1">
                {{ ordenAscendente ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
            </th>

            <th class="text-white font-weight-bold">Mensaje</th>
            <th class="text-white font-weight-bold text-center" style="width: 120px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registrosPaginados" :key="item.ID">
            
            <td class="text-capitalize font-weight-bold text-grey-darken-3 pl-6">
                {{ item.Nombre }}
            </td>
            
            <td class="text-grey-darken-3">
              <div class="d-flex flex-column py-2">
                <div><v-icon size="small" start class="text-grey-darken-3">mdi-email</v-icon>{{ item.Correo }}</div>
                <div class="mt-1"><v-icon size="small" start class="text-grey-darken-3">mdi-phone</v-icon>{{ item.Telefono }}</div>
              </div>
            </td>

            <td class="text-grey-darken-3">
                {{ new Date(item.FechaNacimiento).toLocaleDateString('es-MX') }}
            </td>

            <td class="text-grey-darken-3" style="max-width: 200px;">
              <div class="text-truncate">{{ item.Mensaje }}</div>
            </td>
            
            <td class="text-center">
                <v-btn icon size="small" color="blue" variant="text" @click="abrirEditar(item)" class="mr-2">
                    <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon size="small" color="red" variant="text" @click="eliminarItem(item.ID)">
                    <v-icon>mdi-delete</v-icon>
                </v-btn>
            </td>
          </tr>
          
          <tr v-if="registrosPaginados.length === 0 && !loading">
            <td colspan="5" class="text-center pa-10 text-grey">
                <v-icon size="40" class="mb-2">mdi-magnify-remove-outline</v-icon>
                <div>No se encontraron registros</div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider></v-divider>

      <div v-if="totalPaginas > 1" class="d-flex align-center justify-center pa-3 bg-grey-lighten-4">
          <v-btn icon="mdi-chevron-double-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual = 1" title="Primera página"></v-btn>
          
          <v-btn icon="mdi-chevron-left" variant="plain" size="small" :disabled="paginaActual === 1" @click="paginaActual--" title="Página anterior"></v-btn>

          <span class="mx-4 text-subtitle-2 text-grey-darken-2 font-weight-bold">
              Página {{ paginaActual }} de {{ totalPaginas }}
          </span>

          <v-btn icon="mdi-chevron-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual++" title="Página siguiente"></v-btn>

          <v-btn icon="mdi-chevron-double-right" variant="plain" size="small" :disabled="paginaActual === totalPaginas" @click="paginaActual = totalPaginas" title="Última página"></v-btn>
      </div>

    </v-card>

    <v-dialog v-model="dialogoFormulario" max-width="500" persistent>
        <v-card rounded="xl" class="pa-4">
            <v-card-title class="text-h5 font-weight-bold text-grey-darken-3">
                {{ esEdicion ? `Editar Registro` : 'Nuevo Registro' }}
            </v-card-title>
            
            <v-card-text>
                <v-form ref="formDialog" v-model="valido" @submit.prevent>
                    
                    <v-text-field 
                        v-model="itemFormulario.Nombre" label="Nombre" variant="outlined" color="#42b883" class="mb-2"
                        :rules="reglasNombre" counter="60"
                        @input="v => { itemFormulario.Nombre = v.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') }"
                    ></v-text-field>
                    
                    <v-text-field 
                        v-model="itemFormulario.Correo" label="Correo" variant="outlined" color="#42b883" class="mb-2"
                        :rules="reglasCorreo" counter="100"
                    ></v-text-field>

                    <v-text-field 
                        v-model="itemFormulario.Telefono" label="Teléfono" variant="outlined" color="#42b883" class="mb-2" 
                        maxlength="10" counter="10" :rules="reglasTelefono"
                        @input="v => { 
                            let limpio = v.target.value.replace(/[^0-9]/g, '');
                            if (limpio.length > 10) limpio = limpio.slice(0, 10);
                            itemFormulario.Telefono = limpio;
                        }"
                    ></v-text-field>

                    <v-text-field 
                        v-model="itemFormulario.FechaNacimiento" label="Fecha Nacimiento" type="date" variant="outlined" color="#42b883" class="mb-2"
                        :rules="reglasFecha" :max="fechaMax"
                    ></v-text-field>

                    <v-textarea 
                        v-model="itemFormulario.Mensaje" label="Mensaje" variant="outlined" color="#42b883" rows="3"
                        :rules="reglasMensaje" counter="300"
                    ></v-textarea>
                </v-form>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="grey" variant="text" @click="dialogoFormulario = false">Cancelar</v-btn>
                <v-btn color="#42b883" variant="elevated" class="text-white" @click="guardarDatos" :loading="cargandoGuardar">
                    {{ esEdicion ? 'Actualizar' : 'Guardar' }}
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
.gap-2 {
    gap: 12px;
}
/* Efecto de mano y brillo suave al pasar el mouse por los títulos ordenables */
.cursor-pointer {
    cursor: pointer;
    transition: background-color 0.2s;
    user-select: none; /* Evita que el texto se seleccione al hacer click rápido */
}
.hover-bg:hover {
    background-color: #405871 !important; /* Un tono un poquito más claro que el header original */
}
</style>