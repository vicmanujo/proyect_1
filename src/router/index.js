import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MiPerfilView from '../views/MiPerfilView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/error403',
      name: 'error403',
      component: () => import('../views/Error403View.vue')
    },
    {
      path: '/mi-perfil',
      name: 'mi-perfil',
      component: MiPerfilView
    },

    // ==========================================
    // RUTAS DEL SISTEMA (Con comodines jerárquicos)
    // ==========================================
    { path: '/:menuPadre?/perfil', name: 'perfil', component: () => import('../views/PerfilView.vue') },
    { path: '/:menuPadre?/modulo', name: 'modulo', component: () => import('../views/ModuloView.vue') },
    { path: '/:menuPadre?/permisosperfil', name: 'permisos', component: () => import('../views/PermisosView.vue') },
    { path: '/:menuPadre?/usuario', name: 'usuario', component: () => import('../views/UsuarioView.vue') },
    { path: '/:menuPadre?/menu', name: 'menu', component: () => import('../views/MenuView.vue') },

    { path: '/:menuPadre?/principal1.1', name: 'principal1.1', component: () => import('../views/Principal11View.vue') },
    { path: '/:menuPadre?/principal1.2', name: 'principal1.2', component: () => import('../views/Principal12View.vue') },
    { path: '/:menuPadre?/principal2.1', name: 'principal2.1', component: () => import('../views/Principal21View.vue') },
    { path: '/:menuPadre?/principal2.2', name: 'principal2.2', component: () => import('../views/Principal22View.vue') },

    // 🟢 RUTA COMODÍN (Si escriben algo que no existe)
    {
      path: '/:pathMatch(.*)*', 
      name: 'error',
      component: () => import('../views/ErrorView.vue') 
    }
  ]
})

// ==========================================
// 🚨 GUARDIA DE SEGURIDAD (ZERO TRUST)
// ==========================================
router.beforeEach(async (to, from, next) => {
  const tokenJWT = localStorage.getItem('sesion_activa')
  const usrStr = localStorage.getItem('usuario')
  const menuStr = localStorage.getItem('menuDinamico')

  // 1. Zonas completamente públicas (NO piden sesión)
  const zonasLibres = ['/login', '/error403', '/error']

  // 2. Zonas base (SÍ piden sesión, pero NO validan permisos en la BD)
  const rutasBase = ['/', '/mi-perfil']

  // 🛑 REGLA 1: SIN SESIÓN -> Si intenta ir a cualquier lado que no sea público, ¡Patada al Login!
  if (!tokenJWT && !zonasLibres.includes(to.path)) {
    return next('/login')
  }

  // 🛑 REGLA 2: CON SESIÓN -> Si intenta ir al Login, lo regresamos a Inicio
  if (tokenJWT && to.path === '/login') {
    return next('/')
  }

  // 🛑 REGLA 3: PROTOCOLO ZERO TRUST -> Validar módulos del menú
  // 🟢 LA CORRECCIÓN ESTÁ AQUÍ: Agregamos && !rutasBase.includes(to.path) para que ignore el Inicio y el Perfil
  if (tokenJWT && !zonasLibres.includes(to.path) && !rutasBase.includes(to.path)) {
    let tienePermiso = false;

    // Buscamos si la ruta a la que quiere ir existe en sus permisos asignados
    if (menuStr) {
      const menuObj = JSON.parse(menuStr)
      for (const menu of menuObj) {
        const submodulo = menu.submodulos.find(sub => sub.strRutaUrl === to.path)
        // Solo lo dejamos pasar si lo encontró Y además tiene permiso de Consulta (bitConsulta = true/1)
        if (submodulo && submodulo.permisos && submodulo.permisos.consulta !== false) {
          tienePermiso = true
          break
        }
      }
    }

    // 💥 SI NO TIENE PERMISO SE ACTIVA EL BLOQUEO
    if (!tienePermiso) {
      console.warn(`🚨 INTRUSIÓN DETECTADA: Intento de acceso a ${to.path}`)
      
      if (usrStr) {
        try {
          const usr = JSON.parse(usrStr)
          const baseURL = import.meta.env.DEV ? 'http://localhost:3000' : ''
          
          // 💥 Disparamos la suspensión al backend por 15 minutos
          await fetch(`${baseURL}/api/suspender-cuenta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUsuario: usr.id })
          })
        } catch (error) {
          console.error("Fallo al contactar al servidor para suspender", error)
        }
      }

      // 💥 Destruimos su sesión en el navegador
      localStorage.removeItem('sesion_activa')
      localStorage.removeItem('usuario')
      localStorage.removeItem('menuDinamico')

      // 💥 Lo mandamos a la celda de castigo
      return next('/error403')
    }
  }

  // 4. Si pasó todas las pruebas y es un usuario honesto, lo dejamos pasar amablemente
  next()
})

export default router