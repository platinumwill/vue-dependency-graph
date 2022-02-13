<template v-if="display">
    <Dialog 
        ref="dialog"
        v-model:visible="display"
        @show="adjustPosition"
        :closable="false"
    >
        <template #header>
            {{ index }}-{{ token.text }}
        </template>
        Content
    </Dialog>
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'
import Dialog from 'primevue/dialog'
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


        const x = computed( () => {
            return props.config.offsetX  + props.index * props.config.distance
        })

        const currentSentence: ComputedRef<ModifiedSpacySentence>|undefined = inject('currentSentence')
        if (currentSentence == undefined) {
            return
        }

        const isSegmentRoot = toRef(props.token, 'isSegmentRoot')
        const display: ComputedRef<boolean> = computed( () => {
            return isSegmentRoot.value
        })

        const dialog = ref<any>(null)

        function adjustPosition() {
            dialog.value.container.style.position = 'fixed'
            dialog.value.container.style.left = '' + x.value + 'px'
            dialog.value.container.style.top = '650px'
        }

        const { sourcePatternManager } = sourcePatternLogic(currentSentence)
        const { targetPattern } = targetPatternPieceManager(currentSentence)
        const { patternManager } = patternLogic(sourcePatternManager, targetPattern, currentSentence)
        const segmentManager = createSegmentManager(props.token);
        console.log(patternManager, segmentManager)

        return {
            x
            , dialog
            , display
            , adjustPosition
        }
    }
    , components: {
        Dialog
    }
})
</script>

<style>

</style>
