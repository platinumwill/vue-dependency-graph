<template>
    <div>
        <button @click="openTranslationPatternWindow">Add Pattern Segment</button>
        <Dialog header="Pattern Segment" 
            v-model:visible="displayModal" 
            :maximizable="true"
            :keepInViewport="false"
            @show="generateSegmentItems"
            :style="{width: '50vw'}" :modal="true" :closeOnEscape="true" position="topleft"
            >
            <div>
                <Button icon="pi pi-plus" label="Add Fixed Text" @click="addFixedTextPiece" />
            </div>
            <vue-horizontal responsive>
            <draggable v-model="cardItems" tag="transition-group" item-key="vueKey">
                <template #item="{element}">
                    <SegmentPiece :item="element" @removePiece="removePiece" ></SegmentPiece>
                </template>
            </draggable>
            </vue-horizontal>
            <div>
                <span>譯文暫定位置</span>
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
            , cardItems: []
        }
    }
    , methods: {
        openTranslationPatternWindow: function() {
            this.displayModal = !this.displayModal
        }
        , generateSegmentItems: function() {
            const segmentItems = []
            this.selectedPOSIndices.forEach(function (posIndex) {
                const item = {}
                const token = this.$parent.sentenceParse.words[posIndex]
                item.type = 'POS'
                item.content = token.tag + ' (' + token.lemma + ')'
                item.vueKey = 'sentence-' + this.$parent.currentSentence.indexInDocument + "_pos-" + token.indexInSentence
                item.sortOrder = token.indexInSentence
                segmentItems.push(item)
            }, this)
            this.selectedLemmaIndices.forEach(function (lemmaIndex){
                const item = {}
                const token = this.$parent.sentenceParse.words[lemmaIndex]
                item.type = 'Lemma'
                item.content = token.lemma
                item.vueKey = 'sentence-' + this.$parent.currentSentence.indexInDocument + "_lemma-" + token.indexInSentence
                item.sortOrder = token.indexInSentence
                segmentItems.push(item)
            }, this)
            this.selectedDependencyIndices.forEach(function (dependencyIndex) {
                const item = {}
                const dependency = this.$parent.sentenceParse.arcs[dependencyIndex]
                item.type = 'Dependency'
                item.content = dependency.label
                item.vueKey = 'sentence-' + this.$parent.currentSentence.indexInDocument + "_dependency-" + dependency.indexInSentence
                item.sortOrder = (dependency.trueStart + dependency.trueEnd) / 2
                segmentItems.push(item)
            }, this)
            segmentItems.sort(function(a, b) {
                return a.sortOrder - b.sortOrder
            })
            this.cardItems = segmentItems
        }
        , addFixedTextPiece() {
            this.cardItems.push({
                type: 'Fixed'
                , content: 'TEXT'
                , vueKey: 'fixed-' + this.cardItems.filter(item => item.type === 'fixed').length
            })
        }
        , removePiece(piece) {
            const index = this.cardItems.indexOf(piece)
            if (index < 0) return
            this.cardItems.splice(index, 1)
        }
    }
    , inject: [
            'selectedPOSIndices'
            , 'selectedLemmaIndices'
            , 'selectedDependencyIndices'
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
</style>