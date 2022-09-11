<template>
    <span
        v-if='tokenCopy.translationHelper'
        >
        <span 
            v-for="piece in tokenCopy.targetPatternHelper.dialogPieces.pieces"
            :key="piece.vueKey">
                <span
                    v-if='! piece.isPlaceholder'
                    >
                    {{ piece.displayText }}
                </span>
                <Button
                    v-if='piece.isPlaceholder'
                    :label='piece.displayText'
                    >
                </Button>
        </span>
    </span>
</template>

<script lang="ts">

import { defineComponent } from 'vue'
import { ModifiedSpacyToken } from '@/composables/sentenceManager'

import Button from 'primevue/button'

export default defineComponent({
    props: {
        token: {
            type: ModifiedSpacyToken
            , required: true
        }
    }
    , setup(props: any) {
        return {
            tokenCopy: props.token
        }
    }
    , components: {
        Button
    }
})
</script>