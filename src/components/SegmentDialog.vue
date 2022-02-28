<template v-if="display">
    <Button
        v-show="display"
        ref="button"
        @click="togglePanel"
    >
        {{ index }}-{{ token.text }}
    </Button>

    <OverlayPanel ref="panel">
        panel {{ index }}-{{ token.text }}
    </OverlayPanel>
    
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'

import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'

import { ModifiedSpacySentence, ModifiedSpacyToken } from '@/composables/sentenceManager'
import sourcePatternLogic from '@/composables/sourcePatternManager'
import targetPatternPieceManager from '@/composables/targetPatternPieceManager'
import patternLogic from '@/composables/patternLogic'
import { createSegmentManager } from '@/composables/segmentManager'

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

        const { sourcePatternManager } = sourcePatternLogic(currentSentence)
        const { targetPattern } = targetPatternPieceManager(currentSentence)
        const { patternManager } = patternLogic(sourcePatternManager, targetPattern, currentSentence)
        const segmentManager = createSegmentManager(props.token);
        console.log(patternManager, segmentManager)

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
