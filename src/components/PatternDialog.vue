<template>
    <div>
        <div>
            <Dropdown v-model="sourcePattern.selection.selectedPattern.value"
                :options="sourcePattern.selection.options.value"
                optionLabel="dropdownOptionLabel"
                placeholder="Existing source pattern"
                :showClear="true"
                >
            </Dropdown>
            <br/>
        </div>

        <Button @click="openTranslationPatternWindow" :disabled="!isPatternSavable" >Target Pattern...</Button>

        <Dialog
            v-model:visible="displayModal" 
            :maximizable="true"
            :keepInViewport="false"
            @show="queryOrGenerateDefaultPieces"
            :style="{width: '100vw'}" :modal="true" :closeOnEscape="true" position="topleft"
            >

            <template #header>
                <h2>Target Pattern</h2>

                <h3 v-if="sourcePattern.status.isSourcePatternNew()">New Source Pattern</h3>

                <Dropdown v-model="targetPattern.selection.selected.value"
                    :options="targetPattern.selection.options"
                    optionLabel="dropdownOptionLabel"
                    placeholder="Existing target pattern"
                >
                </Dropdown>
            </template>

            <div>
                <Button icon="pi pi-replay" label="Revert" @click="targetPattern.dialogPieces.revertPieces" />
                <Button icon="pi pi-plus" label="Add Fixed Text" @click="targetPattern.dialogPieces.addFixedTextPiece" style="margin-left: .5em" />
            </div>
            <vue-horizontal responsive>
            <draggable v-model="targetPattern.dialogPieces.pieces.value" tag="transition-group" item-key="vueKey">
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
                v-for="piece in targetPattern.dialogPieces.pieces.value"
                :class="piece.isOptional ? 'optional' : ''"
                :key="piece.vueKey">
                    {{ piece.displayText }}
            </span>
            <div>
                <Button :disabled="! isTargetPatternStorable" icon="pi pi-check" label="Save" @click="savePattern"></Button>
            </div>
        </Dialog>
    </div>
</template>

<script lang="js">
// import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'

import draggable from 'vuedraggable'
import VueHorizontal from "vue-horizontal";
import SegmentPiece from "./SegmentPiece.vue"
import { mapGetters } from 'vuex'
import { computed, inject } from 'vue'

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
            this.currentSentence.words.forEach( (word) => {
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
            this.targetPattern.dialogPieces.queryOrGenerateDefaultPieces(this.currentSentence)
        }
        , removePiece(piece) {
            this.targetPattern.dialogPieces.removePiece(piece)
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
            this.patternManager.saveSelectedPattern()
        }
    }
    , setup() {

        const sourcePattern = inject('sourcePattern')
        const targetPattern = inject('targetPattern')
        const currentSentence = inject('currentSentence')
        const patternManager = inject('patternManager')

        const isTargetPatternStorable = computed( () => {
            return sourcePattern.status.isSourcePatternNew()
            || targetPattern.dialogPieces.isPatternNew()
        })

        return {
            patternManager
            , sourcePattern
            , targetPattern
            , isTargetPatternStorable
            , currentSentence
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