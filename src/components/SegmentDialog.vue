<template v-if="display">
    <Button
        v-show="display"
        ref="button"
        @click="togglePanel"
    >
        {{ index }}-{{ token.text }}
    </Button>

    <OverlayPanel ref="panel">

        <!-- source segment 下拉選單 -->
        <Dropdown v-model="sourceSegment.selection.selectedPattern"
            :options="sourceSegment.selection.options.value"
            optionLabel="dropdownOptionLabel"
            placeholder="Existing source pattern"
            :showClear="true"
            >
        </Dropdown>

        <br/>
        <Button
            @click="toggleTargetPatternDialog"
            >
            Target Pattern...
        </Button>

    </OverlayPanel>

    <!-- target pattern 對話框 -->
    <Dialog
        v-model:visible="showTargetPatternDialog" 
        :maximizable="true"
        :keepInViewport="false"
        :style="{width: '100vw'}" :modal="true" :closeOnEscape="true" position="topleft"
        >
        <template #header>
            <h2>Target Pattern</h2>

        </template>
    </Dialog>
    
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import OverlayPanel from 'primevue/overlaypanel'
import Dropdown from 'primevue/dropdown'

import { ModifiedSpacySentence, ModifiedSpacyToken } from '@/composables/sentenceManager'

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

        // target pattern dialog
        const showTargetPatternDialog = ref<Boolean>(false)
        const toggleTargetPatternDialog = () => {
            showTargetPatternDialog.value = !showTargetPatternDialog.value
        }

        return {
            display
            , panel
            , togglePanel
            , sourceSegment: props.token.segmentHelper
            , showTargetPatternDialog
            , toggleTargetPatternDialog
        }
    }
    , components: {
        Button
        , Dialog
        , Dropdown
        , OverlayPanel
    }
})
</script>

<style>

</style>
