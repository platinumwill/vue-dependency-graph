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
            currentSentence: 'currentSentence'
        })
    }
    , methods: {
        openTranslationPatternWindow: function() {
            this.displayModal = !this.displayModal
        }
        , generateSegmentItems: function() {
            const segmentItems = []
            this.posSelectionManager.selections.forEach(function (posIndex) {
                const item = new Piece()
                const token = this.$parent.spacyFormatHelper.sentenceParse.words[posIndex]
                item.type = 'POS'
                item.content = token.tag + ' (' + token.lemma + ')'
                item.vueKey = 'sentence-' + this.currentSentence.index + "_pos-" + token.indexInSentence
                item.sortOrder = token.indexInSentence
                segmentItems.push(item)
            }, this)
            this.lemmaSelectionManager.selections.forEach(function (lemmaIndex){
                const item = new Piece()
                const token = this.$parent.spacyFormatHelper.sentenceParse.words[lemmaIndex]
                item.type = 'Lemma'
                item.content = token.lemma
                item.vueKey = 'sentence-' + this.currentSentence.index + "_lemma-" + token.indexInSentence
                item.sortOrder = token.indexInSentence
                segmentItems.push(item)
            }, this)
            this.dependencySelectionManager.selections.forEach(function (dependencyIndex) {
                const item = new Piece()
                const dependency = this.$parent.spacyFormatHelper.sentenceParse.arcs[dependencyIndex]
                item.type = 'Dependency'
                item.content = dependency.label
                item.vueKey = 'sentence-' + this.currentSentence.index + "_dependency-" + dependency.indexInSentence
                item.sortOrder = (dependency.trueStart + dependency.trueEnd) / 2
                if (this.selectionHelper.isDependencyPlaceholder(dependency)) {
                    item.isPlaceholder = true
                    item.appliedText = '{' + dependency.label + ' 連接處}'
                }
                segmentItems.push(item)
            }, this)
            segmentItems.sort(function(a, b) {
                return a.sortOrder - b.sortOrder
            })
            this.segmentPieces = segmentItems
            this.segmentPiecesForRevert = [...segmentItems]
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
            this.selectionHelper.saveSelectedPattern(this.$parent.spacyFormatHelper.sentenceParse, this.segmentPieces)
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