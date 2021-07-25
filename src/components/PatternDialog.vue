<template>
    <div>
        <div>
            <Dropdown v-model="sourcePattern.selected.value"
                :options="sourcePattern.options"
                optionLabel="label"
                placeholder="Existing source pattern"
                :showClear="true"
                >
            </Dropdown>
            <br/>
            <Dropdown v-model="targetPattern.selected.value"
                :options="targetPattern.options"
                optionLabel="label"
                placeholder="Existing target pattern"
            >
            </Dropdown>
        </div>

        <Button @click="openTranslationPatternWindow" :disabled="!isPatternSavable" >Add Pattern Segment</Button>

        <Dialog header="Pattern Segment" 
            v-model:visible="displayModal" 
            :maximizable="true"
            :keepInViewport="false"
            @show="queryOrGenerateDefaultPieces"
            :style="{width: '100vw'}" :modal="true" :closeOnEscape="true" position="topleft"
            >
            <div>
                <Button icon="pi pi-replay" label="Revert" @click="revertPieces" />
                <Button icon="pi pi-plus" label="Add Fixed Text" @click="targetPatternContent.addFixedTextPiece" style="margin-left: .5em" />
            </div>
            <vue-horizontal responsive>
            <draggable v-model="targetPatternContent.targetPatternPieces.value" tag="transition-group" item-key="vueKey">
                <template #item="{element}">
                    <SegmentPiece :item="element"
                        @appliedTextChanged="changeAppliedText"
                        @removePiece="removePiece"
                        @isOptionalChanged="changeIsOptional"
                        >
                    </SegmentPiece>
                </template>
            </draggable>
            </vue-horizontal>
            <span 
                v-for="piece in targetPatternContent.targetPatternPieces.value"
                :class="piece.isOptional ? 'optional' : ''"
                :key="piece.vueKey">
                    {{ piece.displayText }}
            </span>
            <div>
                <Button icon="pi pi-check" label="Save" @click="savePattern"></Button>
            </div>
        </Dialog>
    </div>
</template>

<script>
// import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'

import draggable from 'vuedraggable'
import VueHorizontal from "vue-horizontal";
import SegmentPiece from "./SegmentPiece.vue"
import { mapGetters } from 'vuex'
import { inject } from 'vue'

export default {
    components: {
        Dialog
        , draggable
        , VueHorizontal
        , SegmentPiece
        , Button
        , Dropdown
    }
    , data() {
        return {
            displayModal: false
        }
    }
    , computed: {
        isPatternSavable: function() {
            let selectedWordCount = 0
            let beginningWordCount = 0
            this.$parent.currentSpacyFormatSentence.words.forEach( (word) => {
                if (word.selectedMorphologyInfoTypes.length > 0) selectedWordCount++
                if (word.isBeginning) beginningWordCount++
            })
            if (selectedWordCount === 0 || beginningWordCount != 1) return false
            return true
        }
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
    }
    , methods: {
        openTranslationPatternWindow: function() {
            this.displayModal = !this.displayModal
        }
        , queryOrGenerateDefaultPieces: function() {
            this.targetPatternContent.queryOrGenerateDefaultPieces(this.$parent.currentSpacyFormatSentence)
        }
        , revertPieces() {
            this.targetPatternContent.targetPatternPiecesForRevert.forEach(piece => console.log(piece.appliedText))
            this.targetPatternContent.targetPatternPieces.value.splice(
                0
                , this.targetPatternContent.targetPatternPieces.value.length
                , ...this.targetPatternContent.targetPatternPiecesForRevert
            )
            // applied text 可能也要清空
        }
        , removePiece(piece) {
            const index = this.targetPatternContent.targetPatternPieces.value.indexOf(piece)
            if (index < 0) return
            this.targetPatternContent.targetPatternPieces.value.splice(index, 1)
        }
        , changeAppliedText(pieceAndValue) {
            // 是 child component 的事件，但物件的值不能在 child component 修改，要在這裡才能修改
            pieceAndValue.piece.appliedText = pieceAndValue.value
        }
        , changeIsOptional(pieceAndValue) {
            // 是 child component 的事件，但物件的值不能在 child component 修改，要在這裡才能修改
            pieceAndValue.piece.isOptional = pieceAndValue.value
        }
        , savePattern() {
            const selectedWords = this.$parent.currentSpacyFormatSentence.words.filter((word) => {
                return word.selectedMorphologyInfoTypes.length > 0
            })
            const selectedArcs = this.$parent.currentSpacyFormatSentence.arcs.filter((arc) => {
                return arc.selected
            })
            this.patternHelper.saveSelectedPattern(selectedWords, selectedArcs, this.targetPatternContent.targetPatternPieces.value)
        }
    }
    , setup() {

        const sourcePattern = inject('sourcePattern')
        const targetPattern = inject('targetPattern')
        const patternHelper = inject('patternHelper')
        const targetPatternContent = inject('targetPatternContent')

        return {
            patternHelper
            , sourcePattern
            , targetPattern
            , targetPatternContent
        }
    }
}
</script>
<style>
    /* @import '../assets/css/primevue-bootstrap4-dark-blue-theme.css'; */
    @import '../../node_modules/primevue/resources/themes/bootstrap4-dark-blue/theme.css';
    @import '../../node_modules/primevue/resources/primevue.css';
    @import '../../node_modules/primeicons/primeicons.css';
    /* @import '../assets/css/primevue.css'; */
    /* .p-dialog-content {
        background-color: black;
        border-style: solid;
        border-color: white;
    } */
    /* .p-card {
        display: inline;
        width: 30%;
    }
    .p-card-body {
        display: inline;
        width: 30%;
    } */
    span.optional {
        color: gray;
    }
</style>