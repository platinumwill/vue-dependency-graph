<template v-if="display">
    <Button
        v-show="display"
        ref="button"
        @click="togglePanel"
    >
        {{ index }}-{{ token.text }}
    </Button>

    <OverlayPanel ref="panel">
        <Button 
        >
            Target Pattern...
        </Button>
    </OverlayPanel>
    
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'

import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'

import { ModifiedSpacySentence, ModifiedSpacyToken } from '@/composables/sentenceManager'
import { prepareSegment } from '@/composables/sourcePatternSegment'

export default defineComponent({

    props: {
        token: ModifiedSpacyToken
        , config: Object
        , index: Number
    }
    , setup(props: any) {

        // const x = computed( () => {
        //     return props.config.offsetX  + props.index * props.config.distance
        // })

        const currentSentence: ComputedRef<ModifiedSpacySentence>|undefined = inject('currentSentence')
        if (currentSentence == undefined) {
            return
        }

        const isSegmentRoot = toRef(props.token, 'isSegmentRoot')
        const display: ComputedRef<boolean> = computed( () => {
            return isSegmentRoot.value
        })

        const panel = ref<any>(null)
        function togglePanel(event:any) {
            panel.value.toggle(event)
        }

        const sourceSegment = prepareSegment(props.token)
        console.log(sourceSegment)

        return {
            display
            , panel
            , togglePanel
        }
    }
    , components: {
        Button
        , OverlayPanel
    }
})
</script>

<style>

</style>
