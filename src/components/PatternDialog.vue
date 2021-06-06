<template>
    <div>
        <button @click="openTranslationPatternWindow">Add Pattern Segment</button>
        <Dialog header="Pattern Segment" 
            v-model:visible="displayModal" 
            :maximizable="true"
            @show="generateSegmentItems"
            :style="{width: '50vw'}" :modal="true" :closeOnEscape="true" position="topleft"
            >
            <vue-horizontal responsive>
            <draggable v-model="cardItems" tag="transition-group" item-key="vueKey">
                <template #item="{element}">
                    <Card>
                        <template #header>
                            {{ element.type }}
                        </template>
                        <template #title>
                            {{ element.content }}
                        </template>
                        <template #content>
                            {{element}}
                        </template>
                        <template #footer>
                            <Button icon="pi pi-check" label="Save" />
                            <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" style="margin-left: .5em" />
                        </template>
                    </Card>
                </template>
            </draggable>
            </vue-horizontal>
        </Dialog>
    </div>
</template>

<script>
// import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog'
import Card from 'primevue/card'
import Button from 'primevue/button'
import draggable from 'vuedraggable'
import VueHorizontal from "vue-horizontal";

export default {
    components: {
        Dialog
        , Card
        , Button
        , draggable
        , VueHorizontal
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
                segmentItems.push(item)
            }, this)
            this.selectedLemmaIndices.forEach(function (lemmaIndex){
                const item = {}
                const token = this.$parent.sentenceParse.words[lemmaIndex]
                item.type = 'Lemma'
                item.content = token.lemma
                item.vueKey = 'sentence-' + this.$parent.currentSentence.indexInDocument + "_lemma-" + token.indexInSentence
                segmentItems.push(item)
            }, this)
            this.selectedDependencyIndices.forEach(function (dependencyIndex) {
                const item = {}
                const dependency = this.$parent.sentenceParse.arcs[dependencyIndex]
                item.type = 'Dependency'
                item.content = dependency.label
                item.vueKey = 'sentence-' + this.$parent.currentSentence.indexInDocument + "_dependency-" + dependency.indexInSentence
                segmentItems.push(item)
            }, this)
            this.cardItems = segmentItems
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