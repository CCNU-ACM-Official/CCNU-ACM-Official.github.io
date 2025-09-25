<template>
  <div class="competition-result">
    <a :href="link">
      <el-button round>{{ title }}</el-button>
    </a>
    <div v-for="(result, index) in results" :key="index" class="result-item">
      <el-button :type="getButtonType(result.medal)" round>
        {{ result.medal }}
      </el-button>
      {{ result.team }} - {{ result.members }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: String,
  link: String,
  results: Array
})

const getButtonType = (medal) => {
  if (medal === '金奖' || medal === '一等奖') return 'warning'
  if (medal === '银奖' || medal === '二等奖') return 'info'
  if (medal === '铜奖' || medal === '三等奖') return 'success'
  return ''
}
</script>

<style scoped>
.competition-result {
  margin: 1rem 0;
}

.result-item {
  margin: 0.5rem 0 0.5rem 2rem;
}
</style>