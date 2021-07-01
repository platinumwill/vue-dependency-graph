<template>
    <div v-if="isParsedContentReady">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="en"
            id="displacy-svg" class="displacy" :width="width" :height="height" 
            :viewbox="viewbox" :data-format="config.format"
            :style="{color: config.foregroundColor, background: config.backgroundColor, fontFamily: config.fontFamily}" 
            preserveAspectRatio="xMinYMax meet">
            <DependencyNode v-for="(word, index) in sentenceParse.words" :word="word" :index="index" :key="index"></DependencyNode>
            <DependencyEdge v-for="arc in sentenceParse.arcs" :arc="arc" :key="arc.key"></DependencyEdge>
        </svg>
        <PatternDialog></PatternDialog>
    </div>
</template>

<script>
import DependencyEdge from "./DependencyEdge.vue";
import DependencyNode from "./DependencyNode.vue";
import { mapGetters, mapState } from 'vuex'
import { provide } from 'vue'
import PatternDialog from "./PatternDialog.vue"
import selectionManager from "@/composables/selectionManager"

export default {
    data() {
        return {
            spacyFormatDocumentParse: undefined
            , selectedDependencyIndices: []
        }
    }
    , computed: {
        levels: function() {
            return this.spacyFormatDocumentParse === undefined ? [] : [...new Set(this.spacyFormatDocumentParse.arcs.map(({ end, start }) => end - start).sort((a, b) => a - b))]
        }
        , highestLevel: function() {
            return this.levels.indexOf(this.levels.slice(-1)[0]) + 1
        } 
        , width: function() {
            return this.spacyFormatDocumentParse === undefined ? 0 : this.config.offsetX + this.spacyFormatDocumentParse.words.length * this.config.distance
        }
        , height: function() {
            return this.offsetY + 3 * this.config.wordSpacing
        } 
        , viewbox: function() {
            return "0 0 " + this.width + " " + this.height
        }
        , offsetY: function() {
            return this.config.distance / 2 * this.highestLevel
        }
        , isParsedContentReady() {
            return this.spacyFormatDocumentParse !== undefined
        }
        , sentenceParse: function() {
            if (this.spacyFormatDocumentParse === undefined) {
                return {}
            }
            const filteredArcs = this.spacyFormatDocumentParse.arcs.filter(
                arc =>
                arc.start >= this.currentSentence.start 
                && arc.end >= this.currentSentence.start
                && arc.start < this.currentSentence.end 
                && arc.end < this.currentSentence.end 
                )
            let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
            arcsClone.forEach(function (arc, index) {
                arc.start -= (this.currentSentence.start)
                arc.end -= (this.currentSentence.start)
                // Chin format property
                arc.indexInSentence = index
                arc.trueStart = arc.dir == 'right' ? arc.start : arc.end
                arc.trueEnd = arc.dir == 'right' ? arc.end : arc.start
            }, this)
            // Chin format property
            this.spacyFormatDocumentParse.words.forEach((word, index) => word.indexInSentence = index - this.currentSentence.start, this)            
            const sentenceParse = {
                words: this.spacyFormatDocumentParse.words.filter(
                (word, index) =>
                    index >= this.currentSentence.start 
                    && index < this.currentSentence.end
                )
                , arcs: arcsClone
            }
            return sentenceParse
        }
        , ...mapState({
            originalText: 'originalText'
        })
        , ...mapGetters({ 
            isGoogleParseReady: 'isGoogleParseReady'
            , currentSentence: 'currentSentence'
        })
    }
    , watch: {
        originalText (newText) {
            this.delegateToSpaceFormatParserProvider(newText)
        }
    }
    , methods: {
        async delegateToSpaceFormatParserProvider(documentText) {
            await this.spacyFormatParseProvider(documentText).then((spacyFormatParsedResult) => {
                this.spacyFormatDocumentParse = spacyFormatParsedResult
            })
        }
        , toggleDependencyIndexSelected(dependencyIndex) {
            const indexOfDependencyIndex = this.selectedDependencyIndices.indexOf(dependencyIndex)
            if (indexOfDependencyIndex >= 0) {
                this.selectedDependencyIndices.splice(indexOfDependencyIndex, 1)
            } else {
                this.selectedDependencyIndices.push(dependencyIndex)
            }
        }
    }
    , props: {
        config: {
            type: Object
            , default: function() {
                return {
                    distance: 200
                    , offsetX: 50
                    , arrowSpacing: 20
                    , arrowStroke: 2
                    , wordSpacing: 75
                    , format: 'spacy'
                    , foregroundColor: '#ff0000'
                    , selectedForegroundColor: '#00ff00'
                    , backgroundColor: '#000000'
                    , fontFamily:'inherit' 
                    , arrowWidth: 10 
                }
            }
        }
        , spacyFormatParseProvider: {
            type: Function
        }
    }
    , components: {
        DependencyEdge
        , DependencyNode
        , PatternDialog
    } 
    , setup() {

        // provide('posManager', {selections: selectedPOSs, toggler: togglePOSSelected})
        // provide('lemmaManager', {selections: selectedLemmas, toggler: toggleLemmaSelected})

    const {
        selectedPOSs
        , selectedLemmas
        , selectedDependencies
        , togglePOSSelected
        , toggleLemmaSelected
        , toggleDependencySelected
    } = selectionManager()

        provide('selectedPOSIndices', selectedPOSs.value)
        provide('selectedLemmaIndices', selectedLemmas.value)
        provide('selectedDependencyIndices', selectedDependencies.value)
        provide('togglePOSSelected', togglePOSSelected)
        provide('toggleLemmaSelected', toggleLemmaSelected)
        provide('toggleDependencySelected', toggleDependencySelected)
    }
    , provide() {
        return {
            config: this.config
        }
    }
}
</script>