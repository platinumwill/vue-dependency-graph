<template v-if="display">
    <Button
        v-show="display"
        ref="button"
        @click="togglePanel"
    >
        {{ index }}-{{ token.text }}
    </Button>

    <OverlayPanel ref="panel">
        <Dropdown v-model="sourceSegment.selection.selectedPattern.value"
            :options="sourceSegment.selection.options.value"
            optionLabel="dropdownOptionLabel"
            placeholder="Existing source pattern"
            :showClear="true"
            >
        </Dropdown>
        <br/>
    </OverlayPanel>
    
</template>

<script lang="ts">

import { defineComponent, ref, computed, inject, ComputedRef, toRef } from 'vue'

import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'
import Dropdown from 'primevue/dropdown'

import { ModifiedSpacySentence, ModifiedSpacyToken } from '@/composables/sentenceManager'
import * as sourcePattern from '@/composables/sourcePatternSegment'

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

        const sourceSegment = sourcePattern.prepareSegment(props.token)

        return {
            display
            , panel
            , togglePanel
            , sourceSegment
        }
    }
    , components: {
        Button
        , Dropdown
        , OverlayPanel
    }
})
</script>

<style>

</style>
