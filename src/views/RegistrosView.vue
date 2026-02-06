<script setup>
import { ref, onMounted, computed } from 'vue';

const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : '';
const registros = ref([]);
const loading = ref(true);

// Variables del Formulario Modal
const dialogoFormulario = ref(false);
const itemFormulario = ref({}); 
const cargandoGuardar = ref(false);
const esEdicion = ref(false);
const formDialog = ref(null); // Referencia para validar el formulario del modal
const valido = ref(false); // Estado de validez del formulario

const fechaMax = computed(() => {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
});

// --- 🛡️ TUS REGLAS DE VALIDACIÓN ESTRICTAS ---

// 1. Nombre
const reglasNombre = [
  v => !!v || 'El nombre es obligatorio',
  v => (v && v.trim().length > 0) || 'El nombre no puede ser solo espacios',
  v => (v && v.length <= 60) || 'Máximo 60 caracteres',
  v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v) || 'Solo se permiten letras'
];

// 2. Correo
const reglasCorreo = [
  v => !!v || 'El correo es obligatorio',
  v => (v && v.trim().length > 0) || 'No espacios vacíos',
  v => (v && v.length <= 100) || 'Máximo 100 caracteres',
  v => /.+@.+\..+/.test(v) || 'Correo inválido'
];

// 3. Teléfono
const reglasTelefono = [
  v => !!v || 'El teléfono es obligatorio',
  v => /^[0-9]+$/.test(v) || 'Solo números',
  v => (v && v.length === 10) || 'Exactamente 10 dígitos'
];

// 4. Mensaje
const reglasMensaje = [
  v => !!v || 'El mensaje es obligatorio',
  v => (v && v.trim().length > 0) || 'No puede estar vacío',
  v => (v && v.length <= 300) || 'Máximo 300 caracteres'
];

// 5. Fecha (Opcional en edición, obligatoria al crear)
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
    }
  } catch (error) {
    console.error(error);
  }
}

// --- LÓGICA DEL MODAL ---

const abrirCrear = () => {
    itemFormulario.value = {}; 
    esEdicion.value = false;   
    dialogoFormulario.value = true;
}

const abrirEditar = (item) => {
    itemFormulario.value = { ...item }; 
    // Aseguramos que la fecha tenga formato correcto para el input type="date"
    if (itemFormulario.value.FechaNacimiento) {
        itemFormulario.value.FechaNacimiento = itemFormulario.value.FechaNacimiento.split('T')[0];
    }
    esEdicion.value = true;            
    dialogoFormulario.value = true;
}

const guardarDatos = async () => {
    // 1. Limpieza de espacios (Trim)
    if(itemFormulario.value.Nombre) itemFormulario.value.Nombre = itemFormulario.value.Nombre.trim();
    if(itemFormulario.value.Correo) itemFormulario.value.Correo = itemFormulario.value.Correo.trim();
    if(itemFormulario.value.Mensaje) itemFormulario.value.Mensaje = itemFormulario.value.Mensaje.trim();

    // 2. Ejecutar validaciones
    const { valid } = await formDialog.value.validate();
    if (!valid) return; // Si falla, se detiene aquí y no guarda

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
            
            // Usamos nombres en minúscula para el POST si es nuevo, o mapeamos al formato que espera tu backend
            // Truco: Para el POST de nuevo contacto, tu backend espera: nombre, correo, telefono...
            // Para el PUT de editar, espera: Nombre, Correo... (o la lógica mixta que hicimos)
            // Vamos a normalizar enviando un objeto limpio:
            itemFormulario.value = {
                nombre: itemFormulario.value.Nombre, // Mapeamos Nombre -> nombre por seguridad
                correo: itemFormulario.value.Correo,
                telefono: itemFormulario.value.Telefono,
                mensaje: itemFormulario.value.Mensaje,
                fechaNacimiento: itemFormulario.value.FechaNacimiento,
                ...itemFormulario.value // Mantenemos el resto por si acaso
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
                await cargarContactos(); // Recargar lista si es nuevo
            } else {
                // Actualizar localmente si es edición
                const index = registros.value.findIndex(r => r.ID === itemFormulario.value.ID);
                if (index !== -1) {
                    // Actualizamos visualmente
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

onMounted(() => {
  cargarContactos();
});
</script>

<template>
  <v-container class="fill-height d-flex flex-column align-center justify-start pt-10">
    
    <div class="text-center mb-6">
      <v-avatar color="#42b883" size="50" class="mb-3 elevation-2">
        <v-icon color="white">mdi-database-edit</v-icon>
      </v-avatar>
      <h2 class="text-h4 font-weight-bold text-grey-darken-3">Administrar Crud</h2>
    </div>

    <div class="d-flex justify-end w-100 max-width-1100 mb-4" style="max-width: 1100px;">
        <v-btn 
            color="#42b883" 
            prepend-icon="mdi-plus" 
            class="text-white font-weight-bold" 
            rounded="lg"
            elevation="4"
            @click="abrirCrear"
        >
            Agregar Nuevo
        </v-btn>
    </div>

    <v-card elevation="10" rounded="xl" width="100%" max-width="1100" border class="overflow-x-auto">
      <v-table fixed-header height="500px" hover style="min-width: 900px;">
        <thead>
          <tr style="background-color: #35495e;">
            <th class="text-white font-weight-bold">ID</th>
            <th class="text-white font-weight-bold">Nombre</th>
            <th class="text-white font-weight-bold">Contacto</th>
            <th class="text-white font-weight-bold">Mensaje</th>
            <th class="text-white font-weight-bold text-center" style="width: 120px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in registros" :key="item.ID">
            <td class="font-weight-bold text-grey">{{ item.ID }}</td>
            <td class="text-capitalize font-weight-bold text-grey-darken-3">{{ item.Nombre }}</td>
            <td>
              <div class="d-flex flex-column py-2">
                <small class="text-grey-darken-2"><v-icon size="small" start color="#42b883">mdi-email</v-icon>{{ item.Correo }}</small>
                <small class="text-grey-darken-2 mt-1"><v-icon size="small" start color="#42b883">mdi-phone</v-icon>{{ item.Telefono }}</small>
              </div>
            </td>
            <td style="max-width: 200px;">
              <div class="text-truncate text-grey-darken-2">{{ item.Mensaje }}</div>
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
          <tr v-if="registros.length === 0 && !loading">
            <td colspan="5" class="text-center pa-10 text-grey">No hay registros aún</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialogoFormulario" max-width="500" persistent>
        <v-card rounded="xl" class="pa-4">
            <v-card-title class="text-h5 font-weight-bold text-grey-darken-3">
                {{ esEdicion ? `Editar Registro #${itemFormulario.ID}` : 'Nuevo Registro' }}
            </v-card-title>
            
            <v-card-text>
                <v-form ref="formDialog" v-model="valido" @submit.prevent>
                    
                    <v-text-field 
                        v-model="itemFormulario.Nombre" 
                        label="Nombre" 
                        variant="outlined" 
                        color="#42b883" 
                        class="mb-2"
                        :rules="reglasNombre"
                        counter="60"
                        @input="v => { itemFormulario.Nombre = v.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '') }"
                    ></v-text-field>
                    
                    <v-text-field 
                        v-model="itemFormulario.Correo" 
                        label="Correo" 
                        variant="outlined" 
                        color="#42b883" 
                        class="mb-2"
                        :rules="reglasCorreo"
                        counter="100"
                    ></v-text-field>

                    <v-text-field 
                        v-model="itemFormulario.Telefono" 
                        label="Teléfono" 
                        variant="outlined" 
                        color="#42b883" 
                        class="mb-2" 
                        maxlength="10"
                        counter="10"
                        :rules="reglasTelefono"
                        @input="v => { 
                            let limpio = v.target.value.replace(/[^0-9]/g, '');
                            if (limpio.length > 10) limpio = limpio.slice(0, 10);
                            itemFormulario.Telefono = limpio;
                        }"
                    ></v-text-field>

                    <v-text-field 
                        v-model="itemFormulario.FechaNacimiento" 
                        label="Fecha Nacimiento" 
                        type="date" 
                        variant="outlined" 
                        color="#42b883" 
                        class="mb-2"
                        :rules="reglasFecha"
                    ></v-text-field>

                    <v-textarea 
                        v-model="itemFormulario.Mensaje" 
                        label="Mensaje" 
                        variant="outlined" 
                        color="#42b883" 
                        rows="3"
                        :rules="reglasMensaje"
                        counter="300"
                    ></v-textarea>
                </v-form>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="grey" variant="text" @click="dialogoFormulario = false">Cancelar</v-btn>
                <v-btn 
                    color="#42b883" 
                    variant="elevated" 
                    class="text-white" 
                    @click="guardarDatos" 
                    :loading="cargandoGuardar"
                >
                    {{ esEdicion ? 'Actualizar' : 'Guardar' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<style scoped>
/* Asegura que el scroll horizontal funcione bien */
.overflow-x-auto {
    overflow-x: auto !important;
}
</style>