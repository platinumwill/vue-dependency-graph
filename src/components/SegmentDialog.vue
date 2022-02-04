<template v-if="display">
    <Dialog ref="dialog" v-model:visible="display" :closable="false">
        <template #header>
            {{ index }}-{{ token.text }}
        </template>
        Content
    </Dialog>
</template>

<script lang="ts">

import { defineComponent, ref, onMounted, computed } from 'vue'
import Dialog from 'primevue/dialog'
import { ModifiedSpacyToken } from '@/composables/sentenceManager'

export default defineComponent({

    data() {
        return {
            display: true
        }
    }
    , props: {
        token: ModifiedSpacyToken
        , config: Object
        , index: Number
    }
    , setup(props: any) {

        const dialog = ref<any>(null)

        const x = computed( () => {
            return props.config.offsetX  + props.index * props.config.distance
        })

        onMounted(() => {
            dialog.value.container.style.position = 'fixed'
            dialog.value.container.style.left = '' + x.value + 'px'
            dialog.value.container.style.top = '650px'
        })

        return {
            x
            , dialog
        }
    }
    , components: {
        Dialog
    }
})
</script>

<style>

</style>
