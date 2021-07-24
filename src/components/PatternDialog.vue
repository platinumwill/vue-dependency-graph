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
            @show="generateSegmentItems"
            :style="{width: '100vw'}" :modal="true" :closeOnEscape="true" position="topleft"
            >
            <div>
                <Button icon="pi pi-replay" label="Revert" @click="revertPieces" />
                <Button icon="pi pi-plus" label="Add Fixed Text" @click="addFixedTextPiece" style="margin-left: .5em" />
            </div>
            <vue-horizontal responsive>
            <draggable v-model="segmentPieces" tag="transition-group" item-key="vueKey">
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
                v-for="piece in segmentPieces"
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

class Piece {
    constructor () {

    }
    get displayText () {
        return this.appliedText
    }
} 

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
            , segmentPieces: []
            , segmentPiecesForRevert: []
        }
    }
    , computed: {
        isPatternSavable: function() {
            let selectedWordCount = 0
            let beginningWordCount = 0
            this.$parent.currentSpacyFormatSentence.words.forEach( (word) => {
                if (word.selectedMorphologyInfoType !== undefined) selectedWordCount++
                if (word.beginningMorphologyInfoType !== undefined) beginningWordCount++
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
        , generateSegmentItems: function() {
            const segmentPieces = []

            const selectedWords = this.$parent.currentSpacyFormatSentence.words.filter((word) => {
                return word.selectedMorphologyInfoType
            })
            selectedWords.forEach((selectedWord) => {
                const item = new Piece()
                item.type = selectedWord.selectedMorphologyInfoType
                item.content = selectedWord.tag + ' (' + selectedWord.lemma + ')'
                item.vueKey = 'sentence-' + this.currentSentenceIndex + "_" + selectedWord.selectedMorphologyInfoType + "-" + selectedWord.indexInSentence
                item.sortOrder = selectedWord.indexInSentence
                segmentPieces.push(item)
            })
            this.$parent.currentSpacyFormatSentence.arcs.filter((arc) => {
                return arc.selected
            }).forEach((selectedArc) => {
                const item = new Piece()
                item.type = 'Dependency'
                item.content = selectedArc.label
                item.vueKey = 'sentence-' + this.currentSentenceIndex + "_dependency-" + selectedArc.indexInSentence

                item.sortOrder = (selectedArc.trueStart + selectedArc.trueEnd) / 2
                if (this.patternHelper.isDependencyPlaceholder(selectedArc, selectedWords)) {
                    item.isPlaceholder = true
                    item.appliedText = '{' + selectedArc.label + ' 連接處}'
                }
                segmentPieces.push(item)
            })

            segmentPieces.sort(function(a, b) {
                return a.sortOrder - b.sortOrder
            })
            this.segmentPieces = segmentPieces
            this.segmentPiecesForRevert = [...segmentPieces]
        }
        , addFixedTextPiece() {
            const fixedTextPiece = new Piece()
            fixedTextPiece.type = 'Fixed'
            fixedTextPiece.content = 'TEXT'
            fixedTextPiece.vueKey = 'fixed-' + this.segmentPieces.filter(item => item.type === 'fixed').length
            this.segmentPieces.push(fixedTextPiece)
        }
        , revertPieces() {
            this.segmentPiecesForRevert.forEach(piece => console.log(piece.appliedText))
            this.segmentPieces = [...this.segmentPiecesForRevert]
            // applied text 可能也要清空
        }
        , removePiece(piece) {
            const index = this.segmentPieces.indexOf(piece)
            if (index < 0) return
            this.segmentPieces.splice(index, 1)
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
                return word.selectedMorphologyInfoType
            })
            const selectedArcs = this.$parent.currentSpacyFormatSentence.arcs.filter((arc) => {
                return arc.selected
            })
            this.patternHelper.saveSelectedPattern(selectedWords, selectedArcs, this.segmentPieces)
        }
    }
    , setup() {

        const sourcePattern = inject('sourcePattern')
        const targetPattern = inject('targetPattern')
        const patternHelper = inject('patternHelper')

        return {
            patternHelper
            , sourcePattern
            , targetPattern
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