<script setup>
  // Aquí definimos las imágenes del carrusel
  const items = [
    { src: 'https://certifiedhumanelatino.org/wp-content/uploads/2021/06/Design-sem-nome-2-1.png' },
    { src: 'https://pacomarti.com/wp-content/uploads/2023/06/venta-caballos-pre-capa-alazana.webp' },
    { src: 'https://culturacientifica.com/app/uploads/2018/09/historia-de-los-cerdos.jpg' },
    { src: 'https://cdn.shopify.com/s/files/1/0268/6861/files/1519145373-captura_grande.jpg?v=1534682755' },
  ]
</script>

<template>
  <v-carousel :show-arrows="false" cycle hide-delimiter-background show-arrows="hover">
    <v-carousel-item
      v-for="(item, i) in items"
      :key="i"
      :src="item.src"
      cover
    ></v-carousel-item>
  </v-carousel>
</template>