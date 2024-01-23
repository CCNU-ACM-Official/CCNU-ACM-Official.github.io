<!-- Layout.vue -->
<template>
  <Layout>
    <template #doc-after>
      <Comment style="margin-top: 24px;"/>
    </template>
  </Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import Comment from './Comment.vue'

const {Layout} = DefaultTheme
</script>