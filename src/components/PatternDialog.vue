<template>
    <div>
        <button @click="openTranslationPatternWindow">Add Pattern Segment</button>
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
import draggable from 'vuedraggable'
import VueHorizontal from "vue-horizontal";
import SegmentPiece from "./SegmentPiece.vue"
import Button from 'primevue/button'
import { mapGetters } from 'vuex'

import { inject } from "vue"

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
    }
    , data() {
        return {
            displayModal: false
            , segmentPieces: []
            , segmentPiecesForRevert: []
        }
    }
    , computed: {
        ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
    }
    , methods: {
        openTranslationPatternWindow: function() {
            this.displayModal = !this.displayModal
        }
        , generateSegmentItems: function() {
            const segmentPieces = []

            this.$parent.currentSpacyFormatSentence.words.filter((word) => {
                return word.selectedMorphologyInfoType
            }).forEach((selectedWord) => {
                console.log(selectedWord)
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
                console.log(selectedArc)
                const item = new Piece()
                item.type = 'Dependency'
                item.content = selectedArc.label
                item.vueKey = 'sentence-' + this.currentSentenceIndex + "_dependency-" + selectedArc.indexInSentence

                item.sortOrder = (selectedArc.trueStart + selectedArc.trueEnd) / 2
                if (this.selectionHelper.isDependencyPlaceholder(selectedArc)) {
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
            this.selectionHelper.saveSelectedPattern(selectedWords, selectedArcs, this.segmentPieces)
        }
    }
    , setup() {
        const selectionHelper = inject('selectionHelper')

        return { selectionHelper }
    }
    , inject: [
        'posSelectionManager'
        , 'lemmaSelectionManager'
        , 'dependencySelectionManager'
    ]
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