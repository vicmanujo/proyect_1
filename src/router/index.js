import { createRouter, createWebHistory } from 'vue-router'
import InicioView from '../views/InicioView.vue'
import CaptchaView from '../views/CaptchaView.vue'
import ErrorView from '../views/ErrorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 1. Rutas normales
    {
      path: '/',
      name: 'inicio',
      component: InicioView
    },
    {
      path: '/captcha',
      name: 'captcha',
      component: CaptchaView
    },
    {
      path: '/error',
      name: 'error',
      component: ErrorView
    },
    {
      path: '/hola-mundo',
      name: 'holamundo',
      component: () => import('../views/HolaMundoView.vue') 
    },
    {
      path: '/calculadora',
      name: 'calculadora',
      component: () => import('../views/CalculadoraView.vue')
    },
    {
      path: '/formulario',
      name: 'formulario',
      component: () => import('../views/FormularioView.vue')
    },

    // 2. RUTA COMODÍN (SIEMPRE AL FINAL DE TODO)
    // Cualquier ruta que no coincida con las de arriba, caerá aquí.
    {
      path: '/:pathMatch(.*)*', 
      redirect: '/error' 
    }
  ]
})

export default router